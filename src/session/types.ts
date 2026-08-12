import type { LetterTile } from "../games/four-pics/fourPicsLogic";
import type { GameId } from "../games/types";

export const SESSION_SCHEMA_VERSION = 3;

export type RoundResult =
  | "unchecked"
  | "checking"
  | "incorrect"
  | "correct"
  | "revealed"
  | "expired";

export type SessionMode = "fellowship" | "individual" | "team" | "study";
export type ExpiryBehavior = "require-reveal" | "allow-skip" | "auto-reveal";
export type QuestionOrder = "random" | "source";
export type MotionPreference = "system" | "full" | "reduced";
export type ReferenceDisplay = "on-resolution" | "always" | "hidden";

export interface GamePlaylistItem {
  id: string;
  gameId: GameId;
  contentPackId: "kjventure-core";
  roundCount: number;
  order: QuestionOrder;
  timerSeconds: number | null;
  expiryBehavior: ExpiryBehavior;
}

export interface TeamConfig {
  id: string;
  name: string;
  color: "blue" | "teal" | "gold" | "lavender" | "coral" | "green";
}

export interface PlayerConfig {
  id: string;
  name: string;
}

export interface SessionConfig {
  title: string;
  mode: SessionMode;
  playlist: GamePlaylistItem[];
  teams: TeamConfig[];
  players: PlayerConfig[];
  showAudienceScores: boolean;
  soundEnabled: boolean;
  motion: MotionPreference;
  referenceDisplay: ReferenceDisplay;
  fullscreenAtStart: boolean;
}

interface PreparedRoundBase {
  id: string;
  playlistItemId: string;
  contentId: string;
  timerSeconds: number | null;
  expiryBehavior: ExpiryBehavior;
}

export interface PreparedQuizRound extends PreparedRoundBase {
  gameId: "quiz";
}

export interface PreparedFourPicsRound extends PreparedRoundBase {
  gameId: "four-pics";
  hintPositions: readonly number[];
  letterTiles: readonly LetterTile[];
}

export interface PreparedVerseBuilderRound extends PreparedRoundBase {
  gameId: "verse-builder";
  canonicalSegmentIds: readonly string[];
  shuffledSegmentIds: readonly string[];
}

export type PreparedRound =
  | PreparedQuizRound
  | PreparedFourPicsRound
  | PreparedVerseBuilderRound;

interface RoundStateBase {
  result: RoundResult;
}

export interface QuizRoundState extends RoundStateBase {
  gameId: "quiz";
  selectedIndex: number | null;
  wrongIndex: number | null;
  eliminatedOptionIds: number[];
}

export interface FourPicsRoundState extends RoundStateBase {
  gameId: "four-pics";
  selectedIds: string[];
  revealedHintPositions: number[];
}

export interface VerseBuilderRoundState extends RoundStateBase {
  gameId: "verse-builder";
  arrangedSegmentIds: string[];
  attemptCount: number;
  firstSubmissionCorrect: boolean | null;
}

export type PersistedRoundState =
  | QuizRoundState
  | FourPicsRoundState
  | VerseBuilderRoundState;

export interface TimerState {
  enabled: boolean;
  durationMs: number;
  remainingMs: number;
  status: "idle" | "running" | "paused" | "expired";
}

export interface ScoreEvent {
  id: string;
  competitorId: string;
  delta: 1 | -1;
  roundId: string;
  createdAt: string;
}

export interface ActiveSession {
  schemaVersion: number;
  contentVersion: string;
  id: string;
  createdAt: string;
  updatedAt: string;
  status: "ready" | "active" | "paused" | "complete";
  config: SessionConfig;
  roundIndex: number;
  preparedRounds: PreparedRound[];
  roundStates: Record<string, PersistedRoundState>;
  timer: TimerState;
  scoreEvents: ScoreEvent[];
}

export interface SessionPreset {
  id: string;
  title: string;
  description: string;
  builtIn: boolean;
  config: SessionConfig;
}

export interface UserPreferences {
  soundEnabled: boolean;
  motion: MotionPreference;
  referenceDisplay: ReferenceDisplay;
  fullscreenAtStart: boolean;
}
