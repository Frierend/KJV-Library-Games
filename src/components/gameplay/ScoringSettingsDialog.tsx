import { AlertTriangle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createId } from "../../session/createSession";
import { createPlayer, createTeam } from "../../session/presets";
import {
  normalizePlayers,
  normalizeTeams,
  validatePlayers,
  validateTeams,
} from "../../session/scoring";
import type { ActiveSession, PlayerConfig, TeamConfig } from "../../session/types";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { InfoTip } from "../ui/InfoTip";
import { ScoringRosterEditor } from "./ScoringRosterEditor";

export interface ScoringSettingsDraft {
  mode: "individual" | "team";
  players: PlayerConfig[];
  teams: TeamConfig[];
}

interface PendingRemoval {
  id: string;
  name: string;
  kind: "player" | "team";
  players: PlayerConfig[];
  teams: TeamConfig[];
}

interface ScoringSettingsDialogProps {
  open: boolean;
  session: ActiveSession;
  onCancel: () => void;
  onSave: (draft: ScoringSettingsDraft) => void;
}

export function ScoringSettingsDialog({
  open,
  session,
  onCancel,
  onSave,
}: ScoringSettingsDialogProps) {
  const initialMode = session.config.mode === "individual" ? "individual" : "team";
  const [mode, setMode] = useState<"individual" | "team">(initialMode);
  const [players, setPlayers] = useState<PlayerConfig[]>(session.config.players);
  const [teams, setTeams] = useState<TeamConfig[]>(session.config.teams);
  const [pendingMode, setPendingMode] = useState<"individual" | "team" | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const view = pendingMode ? "mode-confirmation" : pendingRemoval ? "removal-confirmation" : "editor";

  useEffect(() => {
    if (!open) return;
    setMode(session.config.mode === "individual" ? "individual" : "team");
    setPlayers(session.config.players.map((player) => ({ ...player })));
    setTeams(session.config.teams.map((team) => ({ ...team })));
    setPendingMode(null);
    setPendingRemoval(null);
  }, [open, session.config]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    return () => previousFocusRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (pendingMode) setPendingMode(null);
        else if (pendingRemoval) setPendingRemoval(null);
        else onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel, open, pendingMode, pendingRemoval, view]);

  const validation = useMemo(
    () => mode === "individual" ? validatePlayers(players) : validateTeams(teams),
    [mode, players, teams],
  );

  if (!open) return null;

  const cancelCurrentView = () => {
    if (pendingMode) setPendingMode(null);
    else if (pendingRemoval) setPendingRemoval(null);
    else onCancel();
  };

  const requestPlayersChange = (next: PlayerConfig[]) => {
    const removed = players.find((player) => !next.some((candidate) => candidate.id === player.id));
    if (removed && session.scoreEvents.some((event) => event.competitorId === removed.id)) {
      setPendingRemoval({
        id: removed.id,
        name: removed.name,
        kind: "player",
        players: next,
        teams,
      });
      return;
    }
    setPlayers(next);
  };

  const requestTeamsChange = (next: TeamConfig[]) => {
    const removed = teams.find((team) => !next.some((candidate) => candidate.id === team.id));
    if (removed && session.scoreEvents.some((event) => event.competitorId === removed.id)) {
      setPendingRemoval({
        id: removed.id,
        name: removed.name,
        kind: "team",
        players,
        teams: next,
      });
      return;
    }
    setTeams(next);
  };

  const modeLabel = (value: "individual" | "team") =>
    value === "individual" ? "Individual Play" : "Team Play";
  const currentCount = mode === "individual" ? players.length : teams.length;
  const currentLabel = mode === "individual" ? "player" : "team";

  return (
    <div className="dialog-backdrop" onMouseDown={cancelCurrentView}>
      <section
        aria-describedby="scoring-settings-description"
        aria-labelledby="scoring-settings-title"
        aria-modal="true"
        className="confirm-dialog scoring-settings-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role={view === "editor" ? "dialog" : "alertdialog"}
      >
        {pendingMode ? (
          <>
            <div className="confirm-dialog__heading">
              <AlertTriangle aria-hidden="true" />
              <div>
                <h2 id="scoring-settings-title">Change to {modeLabel(pendingMode)}?</h2>
                <p id="scoring-settings-description">
                  Saving this change clears {currentCount} {currentLabel}{currentCount === 1 ? "" : "s"}
                  {session.scoreEvents.length > 0
                    ? ` and ${session.scoreEvents.length} score ${session.scoreEvents.length === 1 ? "change" : "changes"}`
                    : ""}.
                </p>
              </div>
            </div>
            <div className="confirm-dialog__actions">
              <Button ref={cancelRef} onClick={() => setPendingMode(null)} variant="ghost">
                Keep {modeLabel(mode)}
              </Button>
              <Button
                onClick={() => {
                  if (pendingMode === "individual") {
                    setPlayers([{ ...createPlayer(0), id: createId("player") }]);
                    setTeams([]);
                  } else {
                    setTeams([
                      { ...createTeam(0), id: createId("team") },
                      { ...createTeam(1), id: createId("team") },
                    ]);
                    setPlayers([]);
                  }
                  setMode(pendingMode);
                  setPendingMode(null);
                }}
                variant="danger"
              >
                Clear and Change Mode
              </Button>
            </div>
          </>
        ) : pendingRemoval ? (
          <>
            <div className="confirm-dialog__heading">
              <AlertTriangle aria-hidden="true" />
              <div>
                <h2 id="scoring-settings-title">Remove {pendingRemoval.name}?</h2>
                <p id="scoring-settings-description">
                  This removes the {pendingRemoval.kind} and its score history.
                </p>
              </div>
            </div>
            <div className="confirm-dialog__actions">
              <Button ref={cancelRef} onClick={() => setPendingRemoval(null)} variant="ghost">
                Keep {pendingRemoval.kind === "player" ? "Player" : "Team"}
              </Button>
              <Button
                onClick={() => {
                  setPlayers(pendingRemoval.players);
                  setTeams(pendingRemoval.teams);
                  setPendingRemoval(null);
                }}
                variant="danger"
              >
                Remove {pendingRemoval.kind === "player" ? "Player" : "Team"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="confirm-dialog__heading">
              <div>
                <span className="eyebrow">Score Controls</span>
                <h2 id="scoring-settings-title">Scoring Settings</h2>
                <p id="scoring-settings-description">Update names or safely change the scoring mode.</p>
              </div>
              <IconButton icon={<X size={20} />} label="Close scoring settings" onClick={onCancel} />
            </div>
            <fieldset className="studio-fieldset scoring-settings-dialog__modes">
              <legend>
                Scoring Mode
                <InfoTip label="Scoring Mode">
                  Individual Play keeps a separate score for each player; Team Play keeps one score for each team. Changing modes clears the current roster and score history after confirmation.
                </InfoTip>
              </legend>
              <div className="mode-grid mode-grid--scoring">
                {(["individual", "team"] as const).map((option) => (
                  <button
                    aria-pressed={mode === option}
                    className={`mode-card ${mode === option ? "is-selected" : ""}`}
                    key={option}
                    onClick={() => mode === option ? undefined : setPendingMode(option)}
                    type="button"
                  >
                    <strong>{modeLabel(option)}</strong>
                    <span>{option === "individual" ? "Everyone competes separately." : "Players compete in groups."}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <ScoringRosterEditor
              heading={false}
              mode={mode}
              onPlayersChange={requestPlayersChange}
              onTeamsChange={requestTeamsChange}
              players={players}
              teams={teams}
            />
            <div className="confirm-dialog__actions">
              <Button ref={cancelRef} onClick={onCancel} variant="ghost">Cancel</Button>
              <Button
                disabled={Boolean(validation.firstError)}
                onClick={() => onSave({
                  mode,
                  players: normalizePlayers(players),
                  teams: normalizeTeams(teams),
                })}
              >
                Save Scoring Settings
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
