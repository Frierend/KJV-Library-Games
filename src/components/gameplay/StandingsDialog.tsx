import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ActiveSession } from "../../session/types";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Scoreboard } from "./Scoreboard";

interface StandingsDialogProps {
  open: boolean;
  session: ActiveSession;
  onClose: () => void;
}

export function StandingsDialog({ open, session, onClose }: StandingsDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const individual = session.config.mode === "individual";

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
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
    return () => {
      window.removeEventListener("keydown", handleKey);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section
        aria-describedby="standings-dialog-description"
        aria-labelledby="standings-dialog-title"
        aria-modal="true"
        className="confirm-dialog standings-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <div className="confirm-dialog__heading">
          <div>
            <span className="eyebrow">Final Results</span>
            <h2 id="standings-dialog-title">{individual ? "Player Standings" : "Team Standings"}</h2>
            <p id="standings-dialog-description">
              All {individual ? "players" : "teams"}, ranked by score. Tied scores share the same rank.
            </p>
          </div>
          <IconButton icon={<X size={20} />} label="Close standings" onClick={onClose} />
        </div>
        <div className="standings-dialog__list">
          <Scoreboard
            dispatch={() => undefined}
            readOnly
            session={session}
            showHeading={false}
          />
        </div>
        <div className="confirm-dialog__actions">
          <Button ref={closeRef} onClick={onClose}>Close Standings</Button>
        </div>
      </section>
    </div>
  );
}
