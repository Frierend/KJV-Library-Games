import { createId, initialRoundState, timerForRound } from "./createSession";
import { activeCompetitors, canAdvance, currentPreparedRound, currentRoundState } from "./selectors";
import type {
  ActiveSession,
  PersistedRoundState,
  PlayerConfig,
  TeamConfig,
} from "./types";

export type SessionAction =
  | { type: "QUIZ_SELECT"; choiceIndex: number; correct: boolean }
  | { type: "FOUR_ADD_LETTER"; tileId: string; capacity: number }
  | { type: "FOUR_DELETE_LETTER" }
  | { type: "FOUR_SUBMIT"; correct: boolean }
  | { type: "VERSE_ADD_SEGMENT"; segmentId: string }
  | { type: "VERSE_REMOVE_SEGMENT"; segmentId: string }
  | { type: "VERSE_MOVE_SEGMENT"; segmentId: string; direction: "earlier" | "later" }
  | { type: "VERSE_SUBMIT"; correct: boolean }
  | { type: "VERSE_MISSING_WORD_CHANGE"; blankIndex: number; value: string }
  | { type: "VERSE_MISSING_WORD_SUBMIT"; incorrectBlankIndexes: number[] }
  | { type: "VERSE_RESET" }
  | { type: "CLEAR_INCORRECT" }
  | { type: "REVEAL" }
  | { type: "RESET_ROUND" }
  | { type: "NEXT" }
  | { type: "PREVIOUS" }
  | { type: "TICK"; remainingMs: number }
  | { type: "TOGGLE_TIMER" }
  | { type: "PAUSE_TIMER_FOR_DIALOG" }
  | { type: "RESUME_TIMER" }
  | { type: "PAUSE_TIMER" }
  | { type: "TOGGLE_SOUND" }
  | { type: "SCORE"; competitorId: string; delta: 1 | -1 }
  | { type: "UNDO_SCORE" }
  | { type: "RESET_SCORES" }
  | {
      type: "CONFIGURE_SCORING";
      mode: "individual" | "team";
      players: PlayerConfig[];
      teams: TeamConfig[];
    };

function updateCurrentRound(
  session: ActiveSession,
  update: (state: PersistedRoundState) => PersistedRoundState,
) {
  const round = currentPreparedRound(session);
  const state = currentRoundState(session);
  if (!round || !state) return session;
  return {
    ...session,
    updatedAt: new Date().toISOString(),
    roundStates: { ...session.roundStates, [round.id]: update(state) },
  };
}

function timerAfterResolution(session: ActiveSession) {
  return session.timer.enabled
    ? { ...session.timer, status: "paused" as const }
    : session.timer;
}

export function sessionReducer(
  session: ActiveSession,
  action: SessionAction,
): ActiveSession {
  const round = currentPreparedRound(session);
  const state = currentRoundState(session);
  if (!round || !state) return session;

  switch (action.type) {
    case "QUIZ_SELECT": {
      if (
        round.gameId !== "quiz" ||
        state.gameId !== "quiz" ||
        state.result !== "unchecked" ||
        session.timer.status === "expired"
      ) return session;
      const next = updateCurrentRound(session, () => ({
        ...state,
        result: action.correct ? "correct" : "incorrect",
        selectedIndex: action.choiceIndex,
        wrongIndex: action.correct ? null : action.choiceIndex,
      }));
      return action.correct ? { ...next, timer: timerAfterResolution(next) } : next;
    }
    case "FOUR_ADD_LETTER":
      if (
        round.gameId !== "four-pics" ||
        state.gameId !== "four-pics" ||
        state.result !== "unchecked" ||
        session.timer.status === "expired" ||
        state.selectedIds.includes(action.tileId) ||
        state.selectedIds.length >= action.capacity
      ) return session;
      return updateCurrentRound(session, () => ({
        ...state,
        selectedIds: [...state.selectedIds, action.tileId],
      }));
    case "FOUR_DELETE_LETTER":
      if (
        round.gameId !== "four-pics" ||
        state.gameId !== "four-pics" ||
        state.result !== "unchecked"
      ) return session;
      return updateCurrentRound(session, () => ({
        ...state,
        selectedIds: state.selectedIds.slice(0, -1),
      }));
    case "FOUR_SUBMIT": {
      if (
        round.gameId !== "four-pics" ||
        state.gameId !== "four-pics" ||
        state.result !== "unchecked" ||
        session.timer.status === "expired"
      ) return session;
      const next = updateCurrentRound(session, () => ({
        ...state,
        result: action.correct ? "correct" : "incorrect",
      }));
      return action.correct ? { ...next, timer: timerAfterResolution(next) } : next;
    }
    case "VERSE_ADD_SEGMENT": {
      if (
        round.gameId !== "verse-builder" ||
        round.playStyle === "missing-words" ||
        state.gameId !== "verse-builder" ||
        state.playStyle === "missing-words" ||
        state.result !== "unchecked" ||
        session.timer.status === "expired" ||
        !round.shuffledSegmentIds.includes(action.segmentId) ||
        state.arrangedSegmentIds.includes(action.segmentId) ||
        state.arrangedSegmentIds.length >= round.shuffledSegmentIds.length
      ) return session;
      return updateCurrentRound(session, () => ({
        ...state,
        arrangedSegmentIds: [...state.arrangedSegmentIds, action.segmentId],
      }));
    }
    case "VERSE_REMOVE_SEGMENT": {
      if (
        round.gameId !== "verse-builder" ||
        round.playStyle === "missing-words" ||
        state.gameId !== "verse-builder" ||
        state.playStyle === "missing-words" ||
        state.result !== "unchecked" ||
        !state.arrangedSegmentIds.includes(action.segmentId)
      ) return session;
      return updateCurrentRound(session, () => ({
        ...state,
        arrangedSegmentIds: state.arrangedSegmentIds.filter((id) => id !== action.segmentId),
      }));
    }
    case "VERSE_MOVE_SEGMENT": {
      if (
        round.gameId !== "verse-builder" ||
        round.playStyle === "missing-words" ||
        state.gameId !== "verse-builder" ||
        state.playStyle === "missing-words" ||
        state.result !== "unchecked"
      ) return session;
      const index = state.arrangedSegmentIds.indexOf(action.segmentId);
      if (index < 0) return session;
      const target = action.direction === "earlier" ? index - 1 : index + 1;
      if (target < 0 || target >= state.arrangedSegmentIds.length) return session;
      const arrangedSegmentIds = [...state.arrangedSegmentIds];
      [arrangedSegmentIds[index], arrangedSegmentIds[target]] = [
        arrangedSegmentIds[target],
        arrangedSegmentIds[index],
      ];
      return updateCurrentRound(session, () => ({ ...state, arrangedSegmentIds }));
    }
    case "VERSE_SUBMIT": {
      if (
        round.gameId !== "verse-builder" ||
        round.playStyle === "missing-words" ||
        state.gameId !== "verse-builder" ||
        state.playStyle === "missing-words" ||
        state.result !== "unchecked" ||
        session.timer.status === "expired" ||
        state.arrangedSegmentIds.length !== round.shuffledSegmentIds.length
      ) return session;
      const next = updateCurrentRound(session, () => ({
        ...state,
        result: action.correct ? "correct" : "incorrect",
        attemptCount: state.attemptCount + 1,
        firstSubmissionCorrect: state.firstSubmissionCorrect ?? action.correct,
      }));
      return action.correct ? { ...next, timer: timerAfterResolution(next) } : next;
    }
    case "VERSE_MISSING_WORD_CHANGE": {
      if (
        round.gameId !== "verse-builder" ||
        round.playStyle !== "missing-words" ||
        state.gameId !== "verse-builder" ||
        state.playStyle !== "missing-words" ||
        state.result === "correct" ||
        state.result === "revealed" ||
        state.result === "expired" ||
        action.blankIndex < 0 ||
        action.blankIndex >= state.drafts.length
      ) return session;
      return updateCurrentRound(session, () => ({
        ...state,
        drafts: state.drafts.map((draft, index) => index === action.blankIndex ? action.value : draft),
        incorrectBlankIndexes: state.incorrectBlankIndexes.filter((index) => index !== action.blankIndex),
      }));
    }
    case "VERSE_MISSING_WORD_SUBMIT": {
      if (
        round.gameId !== "verse-builder" ||
        round.playStyle !== "missing-words" ||
        state.gameId !== "verse-builder" ||
        state.playStyle !== "missing-words" ||
        (state.result !== "unchecked" && state.result !== "incorrect") ||
        session.timer.status === "expired" ||
        state.drafts.some((draft) => !draft.trim())
      ) return session;
      const incorrectBlankIndexes = [...new Set(action.incorrectBlankIndexes)];
      if (
        incorrectBlankIndexes.some((index) => !Number.isInteger(index) || index < 0 || index >= state.drafts.length) ||
        incorrectBlankIndexes.length !== action.incorrectBlankIndexes.length
      ) return session;
      const correct = incorrectBlankIndexes.length === 0;
      const next = updateCurrentRound(session, () => ({
        ...state,
        result: correct ? "correct" : "incorrect",
        incorrectBlankIndexes,
        attemptCount: state.attemptCount + 1,
        firstSubmissionCorrect: state.firstSubmissionCorrect ?? correct,
      }));
      return correct ? { ...next, timer: timerAfterResolution(next) } : next;
    }
    case "VERSE_RESET":
      if (round.gameId !== "verse-builder" || state.gameId !== "verse-builder") return session;
      return {
        ...session,
        status: "active",
        updatedAt: new Date().toISOString(),
        roundStates: {
          ...session.roundStates,
          [round.id]: initialRoundState(round),
        },
      };
    case "CLEAR_INCORRECT":
      if (state.result !== "incorrect") return session;
      return updateCurrentRound(session, () =>
        state.gameId === "quiz"
          ? { ...state, result: "unchecked", selectedIndex: null, wrongIndex: null }
          : state.gameId === "four-pics"
            ? { ...state, result: "unchecked", selectedIds: [] }
            : { ...state, result: "unchecked" },
      );
    case "REVEAL": {
      if (state.result === "revealed") return session;
      const next = updateCurrentRound(session, () =>
        round.gameId === "verse-builder" && state.gameId === "verse-builder" && round.playStyle !== "missing-words" && state.playStyle !== "missing-words"
          ? { ...state, result: "revealed", arrangedSegmentIds: [...round.canonicalSegmentIds] }
          : { ...state, result: "revealed" },
      );
      return { ...next, timer: timerAfterResolution(next) };
    }
    case "RESET_ROUND":
      return {
        ...session,
        status: "active",
        updatedAt: new Date().toISOString(),
        roundStates: {
          ...session.roundStates,
          [round.id]: initialRoundState(round),
        },
        timer: timerForRound(round),
      };
    case "NEXT": {
      if (!canAdvance(state, round.expiryBehavior)) return session;
      if (session.roundIndex >= session.preparedRounds.length - 1) {
        return {
          ...session,
          status: "complete",
          updatedAt: new Date().toISOString(),
          timer: { ...session.timer, status: "idle" },
        };
      }
      const roundIndex = session.roundIndex + 1;
      const nextRound = session.preparedRounds[roundIndex];
      const nextState = session.roundStates[nextRound.id];
      const timer = timerForRound(nextRound, nextState.result === "unchecked");
      if (nextState.result !== "unchecked") timer.status = "paused";
      return {
        ...session,
        status: "active",
        roundIndex,
        updatedAt: new Date().toISOString(),
        timer,
      };
    }
    case "PREVIOUS": {
      if (session.roundIndex === 0) return session;
      const roundIndex = session.roundIndex - 1;
      const previousRound = session.preparedRounds[roundIndex];
      return {
        ...session,
        status: "paused",
        roundIndex,
        updatedAt: new Date().toISOString(),
        timer: timerForRound(previousRound, false),
      };
    }
    case "TICK": {
      if (session.timer.status !== "running" || !session.timer.enabled) return session;
      if (action.remainingMs > 0) {
        return {
          ...session,
          updatedAt: new Date().toISOString(),
          timer: { ...session.timer, remainingMs: action.remainingMs },
        };
      }
      const result = round.expiryBehavior === "auto-reveal" ? "revealed" : "expired";
      const next = updateCurrentRound(session, () =>
        round.gameId === "verse-builder" &&
        state.gameId === "verse-builder" &&
        round.playStyle !== "missing-words" &&
        state.playStyle !== "missing-words" &&
        result === "revealed"
          ? { ...state, result, arrangedSegmentIds: [...round.canonicalSegmentIds] }
          : { ...state, result },
      );
      return {
        ...next,
        timer: { ...session.timer, remainingMs: 0, status: "expired" },
      };
    }
    case "TOGGLE_TIMER":
      if (!session.timer.enabled || session.timer.status === "expired") return session;
      if (state.result === "correct" || state.result === "revealed") return session;
      return {
        ...session,
        status: session.timer.status === "running" ? "paused" : "active",
        updatedAt: new Date().toISOString(),
        timer: {
          ...session.timer,
          status: session.timer.status === "running" ? "paused" : "running",
        },
      };
    case "PAUSE_TIMER_FOR_DIALOG":
      if (!session.timer.enabled || session.timer.status !== "running") return session;
      return {
        ...session,
        updatedAt: new Date().toISOString(),
        timer: { ...session.timer, status: "paused" },
      };
    case "RESUME_TIMER":
      if (
        !session.timer.enabled ||
        session.timer.status !== "paused" ||
        session.timer.remainingMs <= 0 ||
        session.status !== "active" ||
        state.result === "correct" ||
        state.result === "revealed" ||
        state.result === "expired"
      ) return session;
      return {
        ...session,
        updatedAt: new Date().toISOString(),
        timer: { ...session.timer, status: "running" },
      };
    case "PAUSE_TIMER":
      if (session.status === "paused" && session.timer.status !== "running") return session;
      return {
        ...session,
        status: "paused",
        updatedAt: new Date().toISOString(),
        timer:
          session.timer.status === "running"
            ? { ...session.timer, status: "paused" }
            : session.timer,
      };
    case "TOGGLE_SOUND":
      return {
        ...session,
        updatedAt: new Date().toISOString(),
        config: { ...session.config, soundEnabled: !session.config.soundEnabled },
      };
    case "SCORE":
      if (!activeCompetitors(session.config).some((competitor) => competitor.id === action.competitorId)) {
        return session;
      }
      return {
        ...session,
        updatedAt: new Date().toISOString(),
        scoreEvents: [
          ...session.scoreEvents,
          {
            id: createId("score"),
            competitorId: action.competitorId,
            delta: action.delta,
            roundId: round.id,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    case "UNDO_SCORE":
      if (session.scoreEvents.length === 0) return session;
      return {
        ...session,
        updatedAt: new Date().toISOString(),
        scoreEvents: session.scoreEvents.slice(0, -1),
      };
    case "RESET_SCORES":
      if (session.scoreEvents.length === 0) return session;
      return {
        ...session,
        updatedAt: new Date().toISOString(),
        scoreEvents: [],
      };
    case "CONFIGURE_SCORING": {
      const modeChanged = session.config.mode !== action.mode;
      const teams = action.mode === "team" ? action.teams : [];
      const players = action.mode === "individual" ? action.players : [];
      const activeIds = new Set(
        action.mode === "team"
          ? teams.map((team) => team.id)
          : players.map((player) => player.id),
      );
      return {
        ...session,
        updatedAt: new Date().toISOString(),
        config: {
          ...session.config,
          mode: action.mode,
          players,
          teams,
        },
        scoreEvents: modeChanged
          ? []
          : session.scoreEvents.filter((event) => activeIds.has(event.competitorId)),
      };
    }
    default:
      return session;
  }
}
