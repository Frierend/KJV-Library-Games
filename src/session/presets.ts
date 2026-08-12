import type {
  GamePlaylistItem,
  PlayerConfig,
  SessionConfig,
  SessionPreset,
  TeamConfig,
} from "./types";

const colors: TeamConfig["color"][] = [
  "blue",
  "teal",
  "gold",
  "lavender",
  "coral",
  "green",
];

export function createTeam(index: number): TeamConfig {
  return {
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    color: colors[index % colors.length],
  };
}

export function createPlayer(index: number): PlayerConfig {
  return {
    id: `player-${index + 1}`,
    name: `Player ${index + 1}`,
  };
}

export function createPlaylistItem(
  gameId: "quiz" | "four-pics",
  index: number,
  overrides: Partial<GamePlaylistItem> = {},
): GamePlaylistItem {
  return {
    id: `playlist-${index + 1}-${gameId}`,
    gameId,
    contentPackId: "kjventure-core",
    roundCount: gameId === "quiz" ? 10 : 5,
    order: "random",
    timerSeconds: gameId === "quiz" ? 20 : 30,
    expiryBehavior: "require-reveal",
    ...overrides,
  };
}

export const defaultSessionConfig: SessionConfig = {
  title: "KJVenture Session",
  mode: "fellowship",
  playlist: [createPlaylistItem("quiz", 0)],
  teams: [],
  players: [],
  showAudienceScores: true,
  soundEnabled: true,
  motion: "system",
  referenceDisplay: "on-resolution",
  fullscreenAtStart: false,
};

export const builtInPresets: readonly SessionPreset[] = [
  {
    id: "preset-youth-20",
    title: "Youth Fellowship – 20 Minutes",
    description: "An estimated 20-minute mixed session.",
    builtIn: true,
    config: {
      ...defaultSessionConfig,
      title: "Youth Fellowship",
      playlist: [
        createPlaylistItem("quiz", 0, { roundCount: 10, timerSeconds: 20 }),
        createPlaylistItem("four-pics", 1, { roundCount: 5, timerSeconds: 30 }),
      ],
    },
  },
  {
    id: "preset-sunday-school",
    title: "Sunday School – No Time Limit",
    description: "A calm study session with references after each answer.",
    builtIn: true,
    config: {
      ...defaultSessionConfig,
      title: "Sunday School",
      mode: "study",
      playlist: [createPlaylistItem("quiz", 0, { roundCount: 10, timerSeconds: null })],
    },
  },
  {
    id: "preset-family-night",
    title: "Family Game Night",
    description: "Two-team quiz and Four Pics playlist.",
    builtIn: true,
    config: {
      ...defaultSessionConfig,
      title: "Family Game Night",
      mode: "team",
      teams: [createTeam(0), createTeam(1)],
      playlist: [
        createPlaylistItem("quiz", 0, { roundCount: 10, timerSeconds: 20 }),
        createPlaylistItem("four-pics", 1, { roundCount: 5, timerSeconds: 30 }),
      ],
    },
  },
  {
    id: "preset-icebreaker",
    title: "Quick Icebreaker",
    description: "Five fast quiz questions.",
    builtIn: true,
    config: {
      ...defaultSessionConfig,
      title: "Quick Icebreaker",
      playlist: [createPlaylistItem("quiz", 0, { roundCount: 5, timerSeconds: 15 })],
    },
  },
  {
    id: "preset-study-review",
    title: "Bible Study Review",
    description: "Untimed mixed review with available explanations.",
    builtIn: true,
    config: {
      ...defaultSessionConfig,
      title: "Bible Study Review",
      mode: "study",
      playlist: [
        createPlaylistItem("quiz", 0, { roundCount: 10, timerSeconds: null }),
        createPlaylistItem("four-pics", 1, { roundCount: 5, timerSeconds: null }),
      ],
    },
  },
];

export function cloneSessionConfig(config: SessionConfig): SessionConfig {
  return JSON.parse(JSON.stringify(config)) as SessionConfig;
}
