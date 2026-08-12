import { Plus, Trash2 } from "lucide-react";
import { createId } from "../../session/createSession";
import { createPlayer, createTeam } from "../../session/presets";
import {
  MAX_PLAYERS,
  MAX_PLAYER_NAME_LENGTH,
  MAX_TEAMS,
  MAX_TEAM_NAME_LENGTH,
  normalizeParticipantName,
  validatePlayers,
  validateTeams,
} from "../../session/scoring";
import type { PlayerConfig, TeamConfig } from "../../session/types";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";

interface ScoringRosterEditorProps {
  mode: "individual" | "team";
  players: PlayerConfig[];
  teams: TeamConfig[];
  onPlayersChange: (players: PlayerConfig[]) => void;
  onTeamsChange: (teams: TeamConfig[]) => void;
  heading?: boolean;
}

function nextDefaultName(entries: readonly { name: string }[], label: "Player" | "Team") {
  const names = new Set(entries.map((entry) => normalizeParticipantName(entry.name).toLowerCase()));
  let index = entries.length + 1;
  while (names.has(`${label} ${index}`.toLowerCase())) index += 1;
  return `${label} ${index}`;
}

export function ScoringRosterEditor({
  mode,
  players,
  teams,
  onPlayersChange,
  onTeamsChange,
  heading = true,
}: ScoringRosterEditorProps) {
  const individual = mode === "individual";
  const validation = individual ? validatePlayers(players) : validateTeams(teams);
  const entries = individual ? players : teams;
  const singular = individual ? "Player" : "Team";
  const plural = individual ? "Players" : "Teams";
  const limit = individual ? MAX_PLAYERS : MAX_TEAMS;

  const addEntry = () => {
    if (individual) {
      const template = createPlayer(players.length);
      onPlayersChange([
        ...players,
        {
          ...template,
          id: createId("player"),
          name: nextDefaultName(players, "Player"),
        },
      ]);
      return;
    }
    const template = createTeam(teams.length);
    onTeamsChange([
      ...teams,
      {
        ...template,
        id: createId("team"),
        name: nextDefaultName(teams, "Team"),
      },
    ]);
  };

  const updateName = (id: string, name: string) => {
    if (individual) {
      onPlayersChange(players.map((player) => player.id === id ? { ...player, name } : player));
      return;
    }
    onTeamsChange(teams.map((team) => team.id === id ? { ...team, name } : team));
  };

  const removeEntry = (id: string) => {
    if (individual) {
      onPlayersChange(players.filter((player) => player.id !== id));
      return;
    }
    onTeamsChange(teams.filter((team) => team.id !== id));
  };

  return (
    <>
      {heading && (
        <div className="studio-section__heading roster-editor__heading">
          <div>
            <span className="eyebrow">{singular} Roster</span>
            <h2>{plural}</h2>
          </div>
          <Button
            disabled={entries.length >= limit}
            leadingIcon={<Plus size={16} />}
            onClick={addEntry}
            variant="ghost"
          >
            Add {singular}
          </Button>
        </div>
      )}
      {!heading && (
        <div className="roster-editor__toolbar">
          <strong>{plural}</strong>
          <Button
            disabled={entries.length >= limit}
            leadingIcon={<Plus size={16} />}
            onClick={addEntry}
            variant="ghost"
          >
            Add {singular}
          </Button>
        </div>
      )}
      <div className={`participant-editor participant-editor--${mode}`}>
        {entries.map((entry, index) => {
          const error = validation.nameErrors[entry.id];
          const errorId = `participant-name-error-${entry.id}`;
          return (
            <div className="participant-field" key={entry.id}>
              <label className="studio-field">
                <span>{singular} {index + 1}</span>
                <input
                  aria-describedby={error ? errorId : undefined}
                  aria-invalid={Boolean(error)}
                  aria-label={`${singular} ${index + 1} name`}
                  maxLength={individual ? MAX_PLAYER_NAME_LENGTH : MAX_TEAM_NAME_LENGTH}
                  onBlur={(event) => updateName(entry.id, normalizeParticipantName(event.target.value))}
                  onChange={(event) => updateName(entry.id, event.target.value)}
                  value={entry.name}
                />
                {error && <small className="validation-message" id={errorId}>{error}</small>}
              </label>
              <IconButton
                disabled={entries.length <= (individual ? 1 : 2)}
                icon={<Trash2 size={17} />}
                label={`Remove ${entry.name.trim() || `${singular.toLowerCase()} ${index + 1}`}`}
                onClick={() => removeEntry(entry.id)}
              />
            </div>
          );
        })}
      </div>
      {validation.countError && (
        <p className="validation-message" role="alert">{validation.countError}</p>
      )}
    </>
  );
}
