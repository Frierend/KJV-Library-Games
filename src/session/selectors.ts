import type { ActiveSession, PersistedRoundState } from "./types";

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

export function teamScores(session: ActiveSession) {
  const totals = new Map(session.config.teams.map((team) => [team.id, 0]));
  for (const event of session.scoreEvents) {
    totals.set(event.teamId, (totals.get(event.teamId) ?? 0) + event.delta);
  }
  return totals;
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
