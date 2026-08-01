import { SESSION_SCHEMA_VERSION } from "./types";

interface VersionedSnapshot {
  schemaVersion: number;
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
  return value;
}
