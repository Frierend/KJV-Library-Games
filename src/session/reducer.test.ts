import { describe, expect, it } from "vitest";
import { createActiveSession } from "./createSession";
import { defaultSessionConfig } from "./presets";
import { sessionReducer } from "./reducer";
import {
  canAdvance,
  competitorScores,
  currentPreparedRound,
  currentRoundState,
  rankedStandings,
  teamScores,
  winningStandings,
} from "./selectors";

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
    session = sessionReducer(session, { type: "SCORE", competitorId: "team-1", delta: 1 });
    session = sessionReducer(session, { type: "SCORE", competitorId: "team-1", delta: 1 });
    expect(teamScores(session).get("team-1")).toBe(2);
    session = sessionReducer(session, { type: "UNDO_SCORE" });
    expect(teamScores(session).get("team-1")).toBe(1);
  });

  it("updates individual scores independently by stable player ID under rapid dispatches", () => {
    let session = createActiveSession({
      ...defaultSessionConfig,
      mode: "individual",
      players: [
        { id: "player-grace", name: "Grace" },
        { id: "player-faith", name: "Faith" },
      ],
    });
    for (let index = 0; index < 20; index += 1) {
      session = sessionReducer(session, {
        type: "SCORE",
        competitorId: "player-grace",
        delta: 1,
      });
    }
    session = sessionReducer(session, {
      type: "SCORE",
      competitorId: "player-faith",
      delta: -1,
    });

    expect(competitorScores(session)).toEqual(new Map([
      ["player-grace", 20],
      ["player-faith", -1],
    ]));
    session = sessionReducer(session, { type: "UNDO_SCORE" });
    expect(competitorScores(session).get("player-grace")).toBe(20);
    expect(competitorScores(session).get("player-faith")).toBe(0);
  });

  it("keeps scores through a round reset and requires a dedicated full reset", () => {
    let session = createActiveSession({
      ...defaultSessionConfig,
      mode: "individual",
      players: [{ id: "player-1", name: "One" }],
    });
    session = sessionReducer(session, { type: "SCORE", competitorId: "player-1", delta: 1 });
    session = sessionReducer(session, { type: "RESET_ROUND" });
    expect(competitorScores(session).get("player-1")).toBe(1);
    session = sessionReducer(session, { type: "RESET_SCORES" });
    expect(competitorScores(session).get("player-1")).toBe(0);
    expect(session.scoreEvents).toHaveLength(0);
  });

  it("clears incompatible scoring state on mode changes but preserves renamed stable IDs", () => {
    let session = createActiveSession({
      ...defaultSessionConfig,
      mode: "individual",
      players: [
        { id: "player-1", name: "One" },
        { id: "player-2", name: "Two" },
      ],
    });
    session = sessionReducer(session, { type: "SCORE", competitorId: "player-1", delta: 1 });
    session = sessionReducer(session, {
      type: "CONFIGURE_SCORING",
      mode: "individual",
      players: [
        { id: "player-1", name: "Renamed" },
        { id: "player-2", name: "Two" },
      ],
      teams: [],
    });
    expect(competitorScores(session).get("player-1")).toBe(1);

    session = sessionReducer(session, {
      type: "CONFIGURE_SCORING",
      mode: "team",
      players: [],
      teams: [
        { id: "team-a", name: "Alpha", color: "blue" },
        { id: "team-b", name: "Beta", color: "gold" },
      ],
    });
    expect(session.config.mode).toBe("team");
    expect(session.config.players).toEqual([]);
    expect(session.scoreEvents).toEqual([]);
  });

  it("removes only the deleted competitor's score history", () => {
    let session = createActiveSession({
      ...defaultSessionConfig,
      mode: "individual",
      players: [
        { id: "player-1", name: "One" },
        { id: "player-2", name: "Two" },
      ],
    });
    session = sessionReducer(session, { type: "SCORE", competitorId: "player-1", delta: 1 });
    session = sessionReducer(session, { type: "SCORE", competitorId: "player-2", delta: 1 });
    session = sessionReducer(session, {
      type: "CONFIGURE_SCORING",
      mode: "individual",
      players: [{ id: "player-2", name: "Two" }],
      teams: [],
    });
    expect(session.scoreEvents).toHaveLength(1);
    expect(session.scoreEvents[0].competitorId).toBe("player-2");
  });

  it("uses shared competition ranks and reports every tied winner", () => {
    let session = createActiveSession({
      ...defaultSessionConfig,
      mode: "individual",
      players: [
        { id: "player-a", name: "A" },
        { id: "player-b", name: "B" },
        { id: "player-c", name: "C" },
        { id: "player-d", name: "D" },
      ],
    });
    session = sessionReducer(session, { type: "SCORE", competitorId: "player-a", delta: -1 });
    session = sessionReducer(session, { type: "SCORE", competitorId: "player-b", delta: -1 });
    session = sessionReducer(session, { type: "SCORE", competitorId: "player-c", delta: -1 });
    session = sessionReducer(session, { type: "SCORE", competitorId: "player-c", delta: -1 });
    session = sessionReducer(session, { type: "SCORE", competitorId: "player-d", delta: -1 });
    session = sessionReducer(session, { type: "SCORE", competitorId: "player-d", delta: -1 });

    expect(rankedStandings(session).map(({ name, score, rank }) => ({ name, score, rank }))).toEqual([
      { name: "A", score: -1, rank: 1 },
      { name: "B", score: -1, rank: 1 },
      { name: "C", score: -2, rank: 3 },
      { name: "D", score: -2, rank: 3 },
    ]);
    expect(winningStandings(session).map((standing) => standing.name)).toEqual(["A", "B"]);
  });

  it("treats every all-zero player as a tied winner in stable roster order", () => {
    const session = createActiveSession({
      ...defaultSessionConfig,
      mode: "individual",
      players: [
        { id: "player-b", name: "B" },
        { id: "player-a", name: "A" },
      ],
    });
    expect(winningStandings(session).map((standing) => standing.name)).toEqual(["B", "A"]);
  });
});
