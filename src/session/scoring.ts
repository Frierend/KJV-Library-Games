import type { PlayerConfig, TeamConfig } from "./types";

export const MAX_PLAYERS = 50;
export const MAX_PLAYER_NAME_LENGTH = 40;
export const MAX_TEAMS = 6;
export const MAX_TEAM_NAME_LENGTH = 24;
export const MIN_PLAYERS = 1;
export const MIN_TEAMS = 2;

export interface RosterValidation {
  countError: string;
  nameErrors: Record<string, string>;
  firstError: string;
}

export function normalizeParticipantName(name: string) {
  return name.trim();
}

function validateNames(
  entries: readonly { id: string; name: string }[],
  label: "player" | "team",
  maxLength: number,
) {
  const nameErrors: Record<string, string> = {};
  const normalized = entries.map((entry) => normalizeParticipantName(entry.name));
  const frequencies = new Map<string, number>();
  for (const name of normalized) {
    const key = name.toLowerCase();
    if (key) frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
  }
  entries.forEach((entry, index) => {
    const name = normalized[index];
    if (!name) {
      nameErrors[entry.id] = `Enter a ${label} name.`;
    } else if (name.length > maxLength) {
      nameErrors[entry.id] = `${label === "player" ? "Player" : "Team"} names must be ${maxLength} characters or fewer.`;
    } else if ((frequencies.get(name.toLowerCase()) ?? 0) > 1) {
      nameErrors[entry.id] = `This ${label} name is already in use. Enter a different name.`;
    }
  });
  return nameErrors;
}

export function validatePlayers(players: readonly PlayerConfig[]): RosterValidation {
  const countError = players.length < MIN_PLAYERS || players.length > MAX_PLAYERS
    ? `Individual Play requires ${MIN_PLAYERS} to ${MAX_PLAYERS} players.`
    : "";
  const nameErrors = validateNames(players, "player", MAX_PLAYER_NAME_LENGTH);
  return {
    countError,
    nameErrors,
    firstError: countError || Object.values(nameErrors)[0] || "",
  };
}

export function validateTeams(teams: readonly TeamConfig[]): RosterValidation {
  const countError = teams.length < MIN_TEAMS || teams.length > MAX_TEAMS
    ? `Team Play requires ${MIN_TEAMS} to ${MAX_TEAMS} teams.`
    : "";
  const nameErrors = validateNames(teams, "team", MAX_TEAM_NAME_LENGTH);
  return {
    countError,
    nameErrors,
    firstError: countError || Object.values(nameErrors)[0] || "",
  };
}

export function normalizePlayers(players: readonly PlayerConfig[]): PlayerConfig[] {
  return players.map((player) => ({
    ...player,
    name: normalizeParticipantName(player.name),
  }));
}

export function normalizeTeams(teams: readonly TeamConfig[]): TeamConfig[] {
  return teams.map((team) => ({
    ...team,
    name: normalizeParticipantName(team.name),
  }));
}
