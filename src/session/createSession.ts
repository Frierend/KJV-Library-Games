import { CONTENT_VERSION } from "../content/types";
import { prepareFourPicsRounds } from "../games/four-pics/fourPicsAdapter";
import { prepareQuizRounds } from "../games/quiz/quizAdapter";
import {
  SESSION_SCHEMA_VERSION,
  type ActiveSession,
  type GamePlaylistItem,
  type PersistedRoundState,
  type PreparedRound,
  type SessionConfig,
} from "./types";

export function createId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function createSeededRandom(seed: string) {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function preparePlaylistItem(
  item: GamePlaylistItem,
  sessionId: string,
  random: () => number,
): PreparedRound[] {
  if (item.gameId === "quiz") {
    return prepareQuizRounds(item.roundCount, item.order, random).map(
      (record, index) => ({
        id: `${item.id}-${index + 1}-${record.id}`,
        playlistItemId: item.id,
        contentId: record.id,
        gameId: "quiz" as const,
        timerSeconds: item.timerSeconds,
        expiryBehavior: item.expiryBehavior,
      }),
    );
  }

  return prepareFourPicsRounds(
    item.roundCount,
    `${sessionId}-${item.id}`,
    item.order,
    random,
  ).map((prepared, index) => ({
    id: `${item.id}-${index + 1}-${prepared.contentId}`,
    playlistItemId: item.id,
    contentId: prepared.contentId,
    gameId: "four-pics" as const,
    timerSeconds: item.timerSeconds,
    expiryBehavior: item.expiryBehavior,
    hintPositions: prepared.hintPositions,
    letterTiles: prepared.letterTiles,
  }));
}

export function initialRoundState(round: PreparedRound): PersistedRoundState {
  if (round.gameId === "quiz") {
    return {
      gameId: "quiz",
      result: "unchecked",
      selectedIndex: null,
      wrongIndex: null,
      eliminatedOptionIds: [],
    };
  }
  if (round.gameId === "verse-builder") {
    return {
      gameId: "verse-builder",
      result: "unchecked",
      arrangedSegmentIds: [],
      attemptCount: 0,
      firstSubmissionCorrect: null,
    };
  }
  return {
    gameId: "four-pics",
    result: "unchecked",
    selectedIds: [],
    revealedHintPositions: [...round.hintPositions],
  };
}

export function timerForRound(round: PreparedRound, running = true) {
  const durationMs = (round.timerSeconds ?? 0) * 1_000;
  return {
    enabled: round.timerSeconds !== null,
    durationMs,
    remainingMs: durationMs,
    status: round.timerSeconds === null ? ("idle" as const) : running ? ("running" as const) : ("paused" as const),
  };
}

export function createActiveSession(config: SessionConfig): ActiveSession {
  const id = createId("session");
  const random = createSeededRandom(id);
  const preparedRounds = config.playlist.flatMap((item) =>
    preparePlaylistItem(item, id, random),
  );
  if (preparedRounds.length === 0) {
    throw new Error("A session requires at least one prepared round.");
  }
  const roundStates = Object.fromEntries(
    preparedRounds.map((round) => [round.id, initialRoundState(round)]),
  );
  const now = new Date().toISOString();
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    id,
    createdAt: now,
    updatedAt: now,
    status: "active",
    config,
    roundIndex: 0,
    preparedRounds,
    roundStates,
    timer: timerForRound(preparedRounds[0]),
    scoreEvents: [],
  };
}
