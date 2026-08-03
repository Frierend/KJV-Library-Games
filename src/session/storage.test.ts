import { beforeEach, describe, expect, it } from "vitest";
import { createActiveSession } from "./createSession";
import { defaultSessionConfig } from "./presets";
import { sessionReducer } from "./reducer";
import {
  ACTIVE_SESSION_KEY,
  readPreferences,
  readStoredSession,
  saveActiveSession,
  savePreferences,
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
});
