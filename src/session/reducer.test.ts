import { describe, expect, it } from "vitest";
import { createActiveSession } from "./createSession";
import { defaultSessionConfig } from "./presets";
import { sessionReducer } from "./reducer";
import { canAdvance, currentPreparedRound, currentRoundState, teamScores } from "./selectors";

describe("session reducer", () => {
  it("does not advance an unchecked round", () => {
    const session = createActiveSession(defaultSessionConfig);
    const next = sessionReducer(session, { type: "NEXT" });
    expect(next.roundIndex).toBe(0);
  });

  it("advances only after correct or revealed resolution", () => {
    let session = createActiveSession({
      ...defaultSessionConfig,
      playlist: [{ ...defaultSessionConfig.playlist[0], roundCount: 2 }],
    });
    session = sessionReducer(session, {
      type: "QUIZ_SELECT",
      choiceIndex: 0,
      correct: true,
    });
    expect(currentRoundState(session)?.result).toBe("correct");
    session = sessionReducer(session, { type: "NEXT" });
    expect(session.roundIndex).toBe(1);
  });

  it("requires reveal after expiry by default", () => {
    let session = createActiveSession(defaultSessionConfig);
    session = sessionReducer(session, { type: "TICK", remainingMs: 0 });
    const round = currentPreparedRound(session);
    const state = currentRoundState(session);
    expect(state?.result).toBe("expired");
    expect(state && canAdvance(state, round.expiryBehavior)).toBe(false);
    session = sessionReducer(session, { type: "NEXT" });
    expect(session.roundIndex).toBe(0);
    session = sessionReducer(session, { type: "REVEAL" });
    expect(currentRoundState(session)?.result).toBe("revealed");
  });

  it("pauses a running timer for a dialog without pausing the session", () => {
    const session = createActiveSession(defaultSessionConfig);
    const paused = sessionReducer(session, { type: "PAUSE_TIMER_FOR_DIALOG" });

    expect(paused.status).toBe("active");
    expect(paused.timer.status).toBe("paused");
    expect(paused.timer.remainingMs).toBe(session.timer.remainingMs);
    expect(sessionReducer(paused, { type: "RESUME_TIMER" }).timer.status).toBe("running");
  });

  it("does not resume a dialog-paused timer after the session is otherwise paused", () => {
    const running = createActiveSession(defaultSessionConfig);
    const dialogPaused = sessionReducer(running, { type: "PAUSE_TIMER_FOR_DIALOG" });
    const sessionPaused = sessionReducer(dialogPaused, { type: "PAUSE_TIMER" });

    expect(sessionReducer(sessionPaused, { type: "RESUME_TIMER" })).toBe(sessionPaused);
  });

  it.each([
    ["expired", (session: ReturnType<typeof createActiveSession>) =>
      sessionReducer(session, { type: "TICK", remainingMs: 0 })],
    ["resolved", (session: ReturnType<typeof createActiveSession>) =>
      sessionReducer(session, { type: "REVEAL" })],
    ["no-timer", () => createActiveSession({
      ...defaultSessionConfig,
      playlist: [{ ...defaultSessionConfig.playlist[0], timerSeconds: null }],
    })],
  ])("does not restart a %s round", (_label, prepare) => {
    const prepared = prepare(createActiveSession(defaultSessionConfig));
    const paused = sessionReducer(prepared, { type: "PAUSE_TIMER_FOR_DIALOG" });

    expect(sessionReducer(paused, { type: "RESUME_TIMER" })).toBe(paused);
  });

  it("tracks manual team scoring and undo", () => {
    let session = createActiveSession({
      ...defaultSessionConfig,
      mode: "team",
      teams: [
        { id: "team-1", name: "Blue", color: "blue" },
        { id: "team-2", name: "Gold", color: "gold" },
      ],
    });
    session = sessionReducer(session, { type: "SCORE", teamId: "team-1", delta: 1 });
    session = sessionReducer(session, { type: "SCORE", teamId: "team-1", delta: 1 });
    expect(teamScores(session).get("team-1")).toBe(2);
    session = sessionReducer(session, { type: "UNDO_SCORE" });
    expect(teamScores(session).get("team-1")).toBe(1);
  });
});
