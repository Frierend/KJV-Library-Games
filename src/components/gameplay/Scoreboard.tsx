import { Minus, Plus, RotateCcw } from "lucide-react";
import type { ActiveSession } from "../../session/types";
import { teamScores } from "../../session/selectors";
import type { SessionAction } from "../../session/reducer";
import { IconButton } from "../ui/IconButton";

interface ScoreboardProps {
  session: ActiveSession;
  dispatch: (action: SessionAction) => void;
  audience?: boolean;
  readOnly?: boolean;
}

export function Scoreboard({
  session,
  dispatch,
  audience = false,
  readOnly = false,
}: ScoreboardProps) {
  if (session.config.mode !== "team" || session.config.teams.length === 0) {
    return null;
  }
  const scores = teamScores(session);
  return (
    <section
      aria-label={audience ? "Audience team scores" : readOnly ? "Team scores" : "Host score controls"}
      aria-live={audience ? "polite" : undefined}
      className={`scoreboard scoreboard--${audience ? "audience" : readOnly ? "summary" : "host"}`}
    >
      <div className="scoreboard__teams">
        {session.config.teams.map((team) => (
          <article className={`score-team score-team--${team.color}`} key={team.id}>
            <span className="score-team__name">{team.name}</span>
            <strong aria-label={`${team.name}: ${scores.get(team.id) ?? 0} points`}>
              {scores.get(team.id) ?? 0}
            </strong>
            {!readOnly && <div className="score-team__actions">
              <IconButton
                icon={<Minus size={16} />}
                label={`Remove one point from ${team.name}`}
                onClick={() => dispatch({ type: "SCORE", teamId: team.id, delta: -1 })}
              />
              <IconButton
                icon={<Plus size={16} />}
                label={`Add one point to ${team.name}`}
                onClick={() => dispatch({ type: "SCORE", teamId: team.id, delta: 1 })}
              />
            </div>}
          </article>
        ))}
      </div>
      {!readOnly && <IconButton
        disabled={session.scoreEvents.length === 0}
        icon={<RotateCcw size={17} />}
        label="Undo last score change"
        onClick={() => dispatch({ type: "UNDO_SCORE" })}
      />}
    </section>
  );
}
