import type { ReactNode } from "react";

interface HostControlDockProps {
  scoreControls?: ReactNode;
  start?: ReactNode;
  center?: ReactNode;
  end?: ReactNode;
  label?: string;
}

export function HostControlDock({
  scoreControls,
  start,
  center,
  end,
  label = "Host controls",
}: HostControlDockProps) {
  return (
    <nav aria-label={label} className="host-control-dock">
      {scoreControls && <div className="host-control-dock__scores">{scoreControls}</div>}
      <div className="game-controls host-control-dock__navigation">
        <div className="host-control-dock__start">{start}</div>
        <div className="host-control-dock__center">{center}</div>
        <div className="host-control-dock__end">{end}</div>
      </div>
    </nav>
  );
}
