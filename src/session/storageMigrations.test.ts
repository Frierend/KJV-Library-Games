import { describe, expect, it } from "vitest";
import { createActiveSession } from "./createSession";
import { createPlaylistItem, defaultSessionConfig } from "./presets";
import { migrateSessionSnapshot } from "./storageMigrations";

describe("session schema v3 migration", () => {
  it("migrates a v2 Quiz snapshot without changing its prepared rounds or config", () => {
    const session = createActiveSession(defaultSessionConfig);
    const legacy = { ...JSON.parse(JSON.stringify(session)), schemaVersion: 2 };
    const migrated = migrateSessionSnapshot(legacy) as typeof legacy;

    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.preparedRounds).toEqual(legacy.preparedRounds);
    expect(migrated.roundStates).toEqual(legacy.roundStates);
    expect(migrated.config).toEqual(legacy.config);
  });

  it("migrates a v2 Four Pics snapshot without changing its derived puzzle state", () => {
    const session = createActiveSession({
      ...defaultSessionConfig,
      playlist: [createPlaylistItem("four-pics", 0, { roundCount: 1 })],
    });
    const legacy = { ...JSON.parse(JSON.stringify(session)), schemaVersion: 2 };
    const migrated = migrateSessionSnapshot(legacy) as typeof legacy;

    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.preparedRounds).toEqual(legacy.preparedRounds);
    expect(migrated.roundStates).toEqual(legacy.roundStates);
  });
});
