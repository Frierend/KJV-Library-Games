import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_VERSE_BUILDER_SETTINGS } from "../games/verse-builder/verseBuilderTypes";
import { createActiveSession } from "./createSession";
import { createPlaylistItem, defaultSessionConfig } from "./presets";
import { sessionReducer } from "./reducer";
import {
  ACTIVE_SESSION_KEY,
  PRESETS_KEY,
  readPreferences,
  readSavedPresets,
  readStoredSession,
  saveActiveSession,
  savePreferences,
  normalizeRestoredSession,
} from "./storage";

describe("session persistence", () => {
  beforeEach(() => localStorage.clear());

  it("restores a running timer in a safe paused state", () => {
    const session = createActiveSession(defaultSessionConfig);
    saveActiveSession(session);
    const restored = readStoredSession();
    expect(restored.error).toBeNull();
    expect(restored.session?.timer.status).toBe("paused");
    expect(restored.session?.roundIndex).toBe(0);
  });

  it("normalizes a transient incorrect state", () => {
    let session = createActiveSession(defaultSessionConfig);
    session = sessionReducer(session, {
      type: "QUIZ_SELECT",
      choiceIndex: 0,
      correct: false,
    });
    saveActiveSession(session);
    expect(readStoredSession().session?.roundStates[session.preparedRounds[0].id].result).toBe(
      "unchecked",
    );
  });

  it("preserves Verse Builder arrangement and attempt metadata while clearing transient incorrect status", () => {
    const session = createActiveSession(defaultSessionConfig);
    const round = {
      ...session.preparedRounds[0],
      gameId: "verse-builder" as const,
      canonicalSegmentIds: ["one", "two", "three"],
      shuffledSegmentIds: ["two", "one", "three"],
    };
    const snapshot = {
      ...session,
      schemaVersion: 3,
      preparedRounds: [round],
      roundStates: {
        [round.id]: {
          gameId: "verse-builder" as const,
          result: "incorrect" as const,
          arrangedSegmentIds: ["two", "one", "three"],
          attemptCount: 1,
          firstSubmissionCorrect: false,
        },
      },
    };
    const restored = normalizeRestoredSession(snapshot);

    expect(restored.roundStates[round.id]).toMatchObject({
      result: "unchecked",
      arrangedSegmentIds: ["two", "one", "three"],
      attemptCount: 1,
      firstSubmissionCorrect: false,
    });
  });

  it("preserves Missing Words drafts and blank metadata while clearing transient feedback", () => {
    const session = createActiveSession({
      ...defaultSessionConfig,
      playlist: [createPlaylistItem("verse-builder", 0, { verseBuilder: { ...DEFAULT_VERSE_BUILDER_SETTINGS } })],
    });
    const round = session.preparedRounds[0];
    expect(round.gameId).toBe("verse-builder");
    if (round.gameId !== "verse-builder" || round.playStyle !== "missing-words") {
      throw new Error("Missing Words preparation fixture is missing");
    }
    const blankCount = round.blankTokenIndices.length;
    let changed = sessionReducer(session, { type: "VERSE_MISSING_WORD_CHANGE", blankIndex: 0, value: "draft" });
    changed = sessionReducer(changed, {
      type: "VERSE_MISSING_WORD_SUBMIT",
      incorrectBlankIndexes: [0],
    });
    saveActiveSession(changed);

    const restored = readStoredSession().session;
    expect(restored?.roundStates[round.id]).toMatchObject({
      result: "unchecked",
      drafts: ["draft", ...Array(blankCount - 1).fill("")],
      incorrectBlankIndexes: [0],
    });
    expect(restored?.preparedRounds[0]).toMatchObject({
      playStyle: "missing-words",
      blankTokenIndices: round.blankTokenIndices,
    });
  });

  it("reports corrupt state without deleting it", () => {
    localStorage.setItem(ACTIVE_SESSION_KEY, "{not-json");
    expect(readStoredSession().error).toMatch(/could not be read/i);
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBe("{not-json");
  });

  it("rejects an unknown future schema without deleting it", () => {
    const raw = JSON.stringify({ schemaVersion: 99 });
    localStorage.setItem(ACTIVE_SESSION_KEY, raw);
    expect(readStoredSession().error).toMatch(/could not be read/i);
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBe(raw);
  });

  it("rejects a saved session whose round index is outside its prepared rounds", () => {
    const session = createActiveSession(defaultSessionConfig);
    session.roundIndex = session.preparedRounds.length;
    saveActiveSession(session);

    const restored = readStoredSession();
    expect(restored.session).toBeNull();
    expect(restored.error).toMatch(/unsupported or incomplete format/i);
  });

  it("round-trips host preferences and safely fills missing fields", () => {
    savePreferences({
      soundEnabled: false,
      motion: "reduced",
      referenceDisplay: "always",
      fullscreenAtStart: true,
    });
    expect(readPreferences()).toEqual({
      soundEnabled: false,
      motion: "reduced",
      referenceDisplay: "always",
      fullscreenAtStart: true,
    });
  });

  it("migrates a schema-v1 team score event without reinterpreting teams as players", () => {
    let session = createActiveSession({
      ...defaultSessionConfig,
      mode: "team",
      teams: [
        { id: "team-1", name: "Blue", color: "blue" },
        { id: "team-2", name: "Gold", color: "gold" },
      ],
    });
    session = sessionReducer(session, { type: "SCORE", competitorId: "team-1", delta: 1 });
    const legacy = JSON.parse(JSON.stringify(session));
    legacy.schemaVersion = 1;
    delete legacy.config.players;
    legacy.scoreEvents = legacy.scoreEvents.map((event: Record<string, unknown>) => {
      const migrated: Record<string, unknown> = { ...event, teamId: event.competitorId };
      delete migrated.competitorId;
      return migrated;
    });
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(legacy));

    const restored = readStoredSession();
    expect(restored.error).toBeNull();
    expect(restored.session?.schemaVersion).toBe(3);
    expect(restored.session?.config.mode).toBe("team");
    expect(restored.session?.config.players).toEqual([]);
    expect(restored.session?.scoreEvents[0].competitorId).toBe("team-1");
  });

  it("defaults a genuinely missing legacy mode to Team Play", () => {
    const session = createActiveSession({
      ...defaultSessionConfig,
      mode: "team",
      teams: [
        { id: "team-1", name: "Blue", color: "blue" },
        { id: "team-2", name: "Gold", color: "gold" },
      ],
    });
    const legacy = JSON.parse(JSON.stringify(session));
    legacy.schemaVersion = 1;
    delete legacy.config.mode;
    delete legacy.config.players;
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(legacy));

    expect(readStoredSession().session?.config.mode).toBe("team");
  });

  it("normalizes legacy presets and preserves intentional team names", () => {
    localStorage.setItem(PRESETS_KEY, JSON.stringify([{
      id: "legacy-preset",
      title: "Legacy",
      description: "Saved on this device.",
      builtIn: false,
      config: {
        ...defaultSessionConfig,
        mode: undefined,
        players: undefined,
        teams: [
          { id: "team-1", name: "Alpha", color: "blue" },
          { id: "team-2", name: "Beta", color: "teal" },
        ],
      },
    }]));

    expect(readSavedPresets()[0].config).toMatchObject({
      mode: "team",
      players: [],
      teams: [
        { id: "team-1", name: "Alpha" },
        { id: "team-2", name: "Beta" },
      ],
    });
  });

  it("fails safely when an individual session has invalid roster data", () => {
    const session = createActiveSession({
      ...defaultSessionConfig,
      mode: "individual",
      players: [{ id: "player-1", name: "One" }],
    });
    const invalid = JSON.parse(JSON.stringify(session));
    invalid.config.players = [{ id: "player-1", name: "" }];
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(invalid));

    expect(readStoredSession()).toEqual({
      session: null,
      error: "A saved session uses an unsupported or incomplete format.",
    });
  });
});
