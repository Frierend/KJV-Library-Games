import type {
  ActiveSession,
  PersistedRoundState,
  SessionConfig,
  TeamConfig,
} from "./types";

export interface SessionCompetitor {
  id: string;
  name: string;
  kind: "player" | "team";
  color?: TeamConfig["color"];
}

export interface Standing extends SessionCompetitor {
  score: number;
  rank: number;
  rosterIndex: number;
}

export function currentPreparedRound(session: ActiveSession) {
  return session.preparedRounds[session.roundIndex];
}

export function currentRoundState(session: ActiveSession) {
  const round = currentPreparedRound(session);
  return round ? session.roundStates[round.id] : undefined;
}

export function canAdvance(
  state: PersistedRoundState,
  expiryBehavior: "require-reveal" | "allow-skip" | "auto-reveal",
) {
  return (
    state.result === "correct" ||
    state.result === "revealed" ||
    (state.result === "expired" && expiryBehavior === "allow-skip")
  );
}

export function activeCompetitors(config: SessionConfig): SessionCompetitor[] {
  if (config.mode === "individual") {
    return config.players.map((player) => ({ ...player, kind: "player" as const }));
  }
  if (config.mode === "team") {
    return config.teams.map((team) => ({ ...team, kind: "team" as const }));
  }
  return [];
}

export function competitorScores(session: ActiveSession) {
  const totals = new Map(activeCompetitors(session.config).map((competitor) => [competitor.id, 0]));
  for (const event of session.scoreEvents) {
    if (!totals.has(event.competitorId)) continue;
    totals.set(event.competitorId, (totals.get(event.competitorId) ?? 0) + event.delta);
  }
  return totals;
}

export function teamScores(session: ActiveSession) {
  return competitorScores(session);
}

export function rankedStandings(session: ActiveSession): Standing[] {
  const scores = competitorScores(session);
  let previousScore: number | undefined;
  let previousRank = 0;
  return activeCompetitors(session.config)
    .map((competitor, rosterIndex) => ({
      ...competitor,
      rosterIndex,
      score: scores.get(competitor.id) ?? 0,
    }))
    .sort((first, second) => second.score - first.score || first.rosterIndex - second.rosterIndex)
    .map((standing, index) => {
      const rank = standing.score === previousScore ? previousRank : index + 1;
      previousScore = standing.score;
      previousRank = rank;
      return { ...standing, rank };
    });
}

export function winningStandings(session: ActiveSession) {
  return rankedStandings(session).filter((standing) => standing.rank === 1);
}

export function playlistProgress(session: ActiveSession) {
  const current = currentPreparedRound(session);
  const itemRounds = session.preparedRounds.filter(
    (round) => round.playlistItemId === current?.playlistItemId,
  );
  const itemIndex = itemRounds.findIndex((round) => round.id === current?.id);
  return {
    overall: `${session.roundIndex + 1} of ${session.preparedRounds.length}`,
    item: `${itemIndex + 1} of ${itemRounds.length}`,
  };
}
