import { SESSION_SCHEMA_VERSION } from "./types";

interface VersionedSnapshot {
  schemaVersion: number;
}

type UnknownRecord = Record<string, unknown>;

const sessionModes = new Set(["fellowship", "individual", "team", "study"]);

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isVersionedSnapshot(value: unknown): value is VersionedSnapshot {
  return Boolean(
    value &&
    typeof value === "object" &&
    Number.isInteger((value as Partial<VersionedSnapshot>).schemaVersion),
  );
}

/**
 * Pure migration entry point. Version 1 is the first public snapshot, so the
 * migration table intentionally starts empty and rejects unknown versions.
 */
export function migrateSessionSnapshot(value: unknown): unknown {
  if (!isVersionedSnapshot(value)) {
    throw new Error("Saved session has no schema version.");
  }
  if (value.schemaVersion > SESSION_SCHEMA_VERSION || value.schemaVersion < 1) {
    throw new Error("Saved session uses an unsupported schema version.");
  }
  if (value.schemaVersion === SESSION_SCHEMA_VERSION) return value;
  if (!isRecord(value)) return value;

  const config = migrateSessionConfig(value.config);
  const scoreEvents = Array.isArray(value.scoreEvents)
    ? value.scoreEvents.map((event) => {
        if (!isRecord(event)) return event;
        const competitorId = typeof event.competitorId === "string"
          ? event.competitorId
          : event.teamId;
        const migrated: UnknownRecord = { ...event, competitorId };
        delete migrated.teamId;
        return migrated;
      })
    : value.scoreEvents;

  return {
    ...value,
    schemaVersion: SESSION_SCHEMA_VERSION,
    config,
    scoreEvents,
  };
}

export function migrateSessionConfig(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return {
    ...value,
    mode: typeof value.mode === "string" && sessionModes.has(value.mode)
      ? value.mode
      : "team",
    teams: Array.isArray(value.teams) ? value.teams : [],
    players: Array.isArray(value.players) ? value.players : [],
  };
}
