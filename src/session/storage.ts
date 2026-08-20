import { contentRecordExists } from "../content/registry";
import { CONTENT_VERSION } from "../content/types";
import { migrateSessionConfig, migrateSessionSnapshot } from "./storageMigrations";
import {
  SESSION_SCHEMA_VERSION,
  type ActiveSession,
  type GamePlaylistItem,
  type PlayerConfig,
  type ScoreEvent,
  type SessionConfig,
  type SessionPreset,
  type TeamConfig,
  type UserPreferences,
} from "./types";
import { resolveVerseBuilderSettings } from "../games/verse-builder/verseBuilderTypes";

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

const sessionModes = ["fellowship", "individual", "team", "study"] as const;
const teamColors = ["blue", "teal", "gold", "lavender", "coral", "green"] as const;

function normalizedName(name: string) {
  return name.trim().toLowerCase();
}

function hasUniqueNames(entries: readonly { name: string }[]) {
  const names = entries.map((entry) => normalizedName(entry.name));
  return names.every(Boolean) && new Set(names).size === names.length;
}

function isTeamConfig(value: unknown): value is TeamConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TeamConfig>;
  return typeof candidate.id === "string" && Boolean(candidate.id) &&
    typeof candidate.name === "string" && candidate.name.trim().length <= 24 &&
    teamColors.includes(candidate.color as TeamConfig["color"]);
}

function isPlayerConfig(value: unknown): value is PlayerConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PlayerConfig>;
  return typeof candidate.id === "string" && Boolean(candidate.id) &&
    typeof candidate.name === "string" && candidate.name.trim().length <= 40;
}

function isPlaylistItem(value: unknown): value is GamePlaylistItem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GamePlaylistItem>;
  const validBase = typeof candidate.id === "string" &&
    (candidate.gameId === "quiz" || candidate.gameId === "four-pics" || candidate.gameId === "verse-builder") &&
    candidate.contentPackId === "kjventure-core" &&
    Number.isInteger(candidate.roundCount) && Number(candidate.roundCount) > 0 &&
    (candidate.order === "random" || candidate.order === "source") &&
    (candidate.timerSeconds === null ||
      (Number.isInteger(candidate.timerSeconds) && Number(candidate.timerSeconds) >= 5)) &&
     ["require-reveal", "allow-skip", "auto-reveal"].includes(candidate.expiryBehavior ?? "");
  if (!validBase) return false;
  if (candidate.gameId !== "verse-builder" || candidate.verseBuilder === undefined) return true;
  try {
    resolveVerseBuilderSettings(candidate.verseBuilder);
    return true;
  } catch {
    return false;
  }
}

export function isSessionConfig(value: unknown): value is SessionConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SessionConfig>;
  if (
    typeof candidate.title !== "string" ||
    !sessionModes.includes(candidate.mode as SessionConfig["mode"]) ||
    !Array.isArray(candidate.playlist) || !candidate.playlist.every(isPlaylistItem) ||
    !Array.isArray(candidate.teams) || !candidate.teams.every(isTeamConfig) ||
    !Array.isArray(candidate.players) || !candidate.players.every(isPlayerConfig) ||
    typeof candidate.showAudienceScores !== "boolean" ||
    typeof candidate.soundEnabled !== "boolean" ||
    !["system", "full", "reduced"].includes(candidate.motion ?? "") ||
    !["on-resolution", "always", "hidden"].includes(candidate.referenceDisplay ?? "") ||
    typeof candidate.fullscreenAtStart !== "boolean"
  ) return false;
  if (new Set(candidate.teams.map((team) => team.id)).size !== candidate.teams.length) return false;
  if (new Set(candidate.players.map((player) => player.id)).size !== candidate.players.length) return false;
  if (!hasUniqueNames(candidate.teams) && candidate.teams.length > 0) return false;
  if (!hasUniqueNames(candidate.players) && candidate.players.length > 0) return false;
  if (candidate.mode === "team" && (candidate.teams.length < 2 || candidate.teams.length > 6)) {
    return false;
  }
  if (candidate.mode === "individual" && (candidate.players.length < 1 || candidate.players.length > 50)) {
    return false;
  }
  return true;
}

function isScoreEvent(value: unknown): value is ScoreEvent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ScoreEvent>;
  return typeof candidate.id === "string" &&
    typeof candidate.competitorId === "string" &&
    (candidate.delta === 1 || candidate.delta === -1) &&
    typeof candidate.roundId === "string" &&
    typeof candidate.createdAt === "string";
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
    isSessionConfig(candidate.config) &&
    Boolean(candidate.roundStates) && typeof candidate.roundStates === "object" &&
    Boolean(candidate.timer) && typeof candidate.timer === "object" &&
    Array.isArray(candidate.scoreEvents) && candidate.scoreEvents.every(isScoreEvent)
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
        : state.gameId === "four-pics"
          ? [id, { ...state, result: "unchecked", selectedIds: [] }]
          : [id, { ...state, result: "unchecked" }];
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
    return parsed.flatMap((preset) => {
      if (!preset || typeof preset !== "object") return [];
      const candidate = preset as Partial<SessionPreset>;
      const config = migrateSessionConfig(candidate.config);
      if (
        typeof candidate.id !== "string" ||
        typeof candidate.title !== "string" ||
        typeof candidate.description !== "string" ||
        typeof candidate.builtIn !== "boolean" ||
        !isSessionConfig(config)
      ) return [];
      return [{ ...candidate, config } as SessionPreset];
    });
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
