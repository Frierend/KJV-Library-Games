import { contentRecordExists } from "../content/registry";
import { CONTENT_VERSION } from "../content/types";
import { migrateSessionSnapshot } from "./storageMigrations";
import {
  SESSION_SCHEMA_VERSION,
  type ActiveSession,
  type SessionPreset,
  type UserPreferences,
} from "./types";

export const ACTIVE_SESSION_KEY = "kjventure.session.v1";
export const PRESETS_KEY = "kjventure.presets.v1";
export const PREFERENCES_KEY = "kjventure.preferences.v1";

export const defaultPreferences: UserPreferences = {
  soundEnabled: true,
  motion: "system",
  referenceDisplay: "on-resolution",
  fullscreenAtStart: false,
};

export interface StoredSessionResult {
  session: ActiveSession | null;
  error: string | null;
}

function isActiveSession(value: unknown): value is ActiveSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ActiveSession>;
  return (
    candidate.schemaVersion === SESSION_SCHEMA_VERSION &&
    candidate.contentVersion === CONTENT_VERSION &&
    typeof candidate.id === "string" &&
    Array.isArray(candidate.preparedRounds) &&
    candidate.preparedRounds.length > 0 &&
    typeof candidate.roundIndex === "number" &&
    Number.isInteger(candidate.roundIndex) &&
    candidate.roundIndex >= 0 &&
    candidate.roundIndex < candidate.preparedRounds.length &&
    Boolean(candidate.config) &&
    Boolean(candidate.roundStates) &&
    Boolean(candidate.timer)
  );
}

export function normalizeRestoredSession(session: ActiveSession): ActiveSession {
  const roundStates = Object.fromEntries(
    Object.entries(session.roundStates).map(([id, state]) => {
      if (state.result !== "checking" && state.result !== "incorrect") {
        return [id, state];
      }
      return state.gameId === "quiz"
        ? [id, { ...state, result: "unchecked", selectedIndex: null, wrongIndex: null }]
        : [id, { ...state, result: "unchecked", selectedIds: [] }];
    }),
  );
  return {
    ...session,
    status: session.status === "complete" ? "complete" : "paused",
    roundStates,
    timer: {
      ...session.timer,
      remainingMs: Math.max(0, session.timer.remainingMs),
      status:
        session.timer.status === "idle" || session.timer.status === "expired"
          ? session.timer.status
          : "paused",
    },
  };
}

export function readStoredSession(): StoredSessionResult {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return { session: null, error: null };
    const parsed = migrateSessionSnapshot(JSON.parse(raw));
    if (!isActiveSession(parsed)) {
      return {
        session: null,
        error: "A saved session uses an unsupported or incomplete format.",
      };
    }
    if (
      parsed.preparedRounds.some(
        (round) =>
          !contentRecordExists(round.contentId) || !parsed.roundStates[round.id],
      )
    ) {
      return {
        session: null,
        error: "A saved session references content that is no longer available.",
      };
    }
    return { session: normalizeRestoredSession(parsed), error: null };
  } catch {
    return {
      session: null,
      error: "The saved session could not be read. It has not been deleted.",
    };
  }
}

export function saveActiveSession(session: ActiveSession) {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // The UI remains usable when private mode or storage quotas block persistence.
  }
}

export function removeStoredSession() {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // Storage is optional.
  }
}

export function readSavedPresets(): SessionPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (preset): preset is SessionPreset =>
        Boolean(preset) &&
        typeof preset === "object" &&
        typeof (preset as SessionPreset).id === "string" &&
        typeof (preset as SessionPreset).title === "string" &&
        Boolean((preset as SessionPreset).config),
    );
  } catch {
    return [];
  }
}

export function savePresets(presets: readonly SessionPreset[]) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch {
    // Preset saving degrades gracefully when storage is unavailable.
  }
}

export function readPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      soundEnabled:
        typeof parsed.soundEnabled === "boolean"
          ? parsed.soundEnabled
          : defaultPreferences.soundEnabled,
      motion: ["system", "full", "reduced"].includes(parsed.motion ?? "")
        ? parsed.motion as UserPreferences["motion"]
        : defaultPreferences.motion,
      referenceDisplay: ["on-resolution", "always", "hidden"].includes(
        parsed.referenceDisplay ?? "",
      )
        ? parsed.referenceDisplay as UserPreferences["referenceDisplay"]
        : defaultPreferences.referenceDisplay,
      fullscreenAtStart:
        typeof parsed.fullscreenAtStart === "boolean"
          ? parsed.fullscreenAtStart
          : defaultPreferences.fullscreenAtStart,
    };
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(preferences: UserPreferences) {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences are optional when storage is unavailable.
  }
}
