import { ListOrdered, Minus, Plus, RotateCcw, Settings2, Trash2 } from "lucide-react";
import type { SessionAction } from "../../session/reducer";
import {
  activeCompetitors,
  competitorScores,
  rankedStandings,
  winningStandings,
  type Standing,
} from "../../session/selectors";
import type { ActiveSession } from "../../session/types";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";

const AUDIENCE_FULL_ROSTER_LIMIT = 8;

interface ScoreboardProps {
  session: ActiveSession;
  dispatch: (action: SessionAction) => void;
  audience?: boolean;
  readOnly?: boolean;
  onConfigure?: () => void;
  onOpenStandings?: () => void;
  onResetScores?: () => void;
  showHeading?: boolean;
}

function pointsLabel(score: number) {
  return `${score} ${Math.abs(score) === 1 ? "point" : "points"}`;
}

function winnerText(standings: readonly Standing[]) {
  if (standings.length === 0) return "";
  const label = standings.length === 1 ? "Winner" : "Joint Winners";
  return `${label}: ${standings.map((standing) => standing.name).join(", ")} — ${pointsLabel(standings[0].score)}.`;
}

export function Scoreboard({
  session,
  dispatch,
  audience = false,
  readOnly = false,
  onConfigure,
  onOpenStandings,
  onResetScores,
  showHeading = true,
}: ScoreboardProps) {
  if (session.config.mode !== "team" && session.config.mode !== "individual") return null;
  const competitors = activeCompetitors(session.config);
  if (competitors.length === 0) return null;
  const individual = session.config.mode === "individual";
  const scores = competitorScores(session);
  const standings = rankedStandings(session);
  const winners = winningStandings(session);
  const lastEvent = session.scoreEvents.at(-1);
  const displayed = audience || readOnly
    ? standings
    : competitors.map((competitor, rosterIndex) => ({
        ...competitor,
        rank: 0,
        rosterIndex,
        score: scores.get(competitor.id) ?? 0,
      }));
  const compactAudience = audience && competitors.length > AUDIENCE_FULL_ROSTER_LIMIT;
  const regionLabel = audience
    ? "Audience Standings"
    : readOnly
      ? individual ? "Player Standings" : "Team Standings"
      : individual ? "Host Player Score Controls" : "Host Team Score Controls";

  return (
    <section
      aria-label={regionLabel}
      aria-live={audience ? "polite" : undefined}
      className={`scoreboard scoreboard--${audience ? "audience" : readOnly ? "summary" : "host"} scoreboard--${session.config.mode} ${competitors.length > AUDIENCE_FULL_ROSTER_LIMIT ? "scoreboard--large" : ""}`}
    >
      {readOnly && !audience && showHeading && (
        <header className="scoreboard__heading">
          <h2>{individual ? "Player Standings" : "Team Standings"}</h2>
          <p>{winnerText(winners)}</p>
        </header>
      )}

      {compactAudience ? (
        <div className="scoreboard__leader-summary">
          <strong>
            {winners.length === 1
              ? `${winners[0].name} leads with ${pointsLabel(winners[0].score)}.`
              : `${winners.length} ${individual ? "players" : "teams"} are tied for the lead at ${pointsLabel(winners[0].score)}.`}
          </strong>
          {onOpenStandings && (
            <Button
              leadingIcon={<ListOrdered size={17} />}
              onClick={onOpenStandings}
              variant="secondary"
            >
              View All {individual ? "Player" : "Team"} Standings
            </Button>
          )}
        </div>
      ) : (
        <div className="scoreboard__teams scoreboard__competitors">
          {displayed.map((competitor) => {
            const recentlyAdjusted = lastEvent?.competitorId === competitor.id;
            return (
              <article
                className={[
                  "score-team",
                  "score-competitor",
                  competitor.color ? `score-team--${competitor.color}` : "score-competitor--player",
                  recentlyAdjusted ? "is-recent" : "",
                ].join(" ")}
                key={competitor.id}
              >
                {(audience || readOnly) && (
                  <span className="score-competitor__rank" aria-label={`Rank ${competitor.rank}`}>
                    {competitor.rank}
                  </span>
                )}
                <span className="score-team__name score-competitor__name">{competitor.name}</span>
                <strong aria-label={`${competitor.name}: ${competitor.score} points`}>
                  {competitor.score}
                </strong>
                {recentlyAdjusted && <span className="score-competitor__recent">Last Score Change</span>}
                {!readOnly && !audience && (
                  <div className="score-team__actions score-competitor__actions">
                    <IconButton
                      icon={<Minus size={16} />}
                      label={`Subtract 1 point from ${competitor.name}`}
                      onClick={() => dispatch({ type: "SCORE", competitorId: competitor.id, delta: -1 })}
                    />
                    <IconButton
                      icon={<Plus size={16} />}
                      label={`Add 1 point to ${competitor.name}`}
                      onClick={() => dispatch({ type: "SCORE", competitorId: competitor.id, delta: 1 })}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!readOnly && !audience && (
        <div className="scoreboard__actions">
          <IconButton
            disabled={session.scoreEvents.length === 0}
            icon={<RotateCcw size={17} />}
            label="Undo last score change"
            onClick={() => dispatch({ type: "UNDO_SCORE" })}
          />
          {onResetScores && (
            <IconButton
              disabled={session.scoreEvents.length === 0}
              icon={<Trash2 size={17} />}
              label={`Reset all ${individual ? "player" : "team"} scores`}
              onClick={onResetScores}
            />
          )}
          {onConfigure && (
            <IconButton
              icon={<Settings2 size={17} />}
              label={`Edit ${individual ? "player" : "team"} scoring settings`}
              onClick={onConfigure}
            />
          )}
        </div>
      )}
      {!readOnly && !audience && lastEvent && (
        <p aria-live="polite" className="sr-only">
          Last score change: {competitors.find((competitor) => competitor.id === lastEvent.competitorId)?.name}, {pointsLabel(scores.get(lastEvent.competitorId) ?? 0)}.
        </p>
      )}
    </section>
  );
}
