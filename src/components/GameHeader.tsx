import { formatTimer, toggleFullscreen } from "../utils";

interface GameHeaderProps {
  gameName: string;
  progress: string;
  timeLeft: number;
  expired: boolean;
  sound: boolean;
  onToggleSound: () => void;
  onExit: () => void;
}

export function GameHeader({
  gameName,
  progress,
  timeLeft,
  expired,
  sound,
  onToggleSound,
  onExit,
}: GameHeaderProps) {
  return (
    <header className="play-header">
      <button className="brand-button" onClick={onExit}>
        <span className="brand-mark">✦</span>
        <span>
          <strong>{gameName}</strong>
          <small>Back to games</small>
        </span>
      </button>
      <div className={`timer ${expired ? "timer--expired" : "timer--running"}`}>
        {formatTimer(timeLeft)}
      </div>
      <div className="play-header__actions">
        <span className="progress-label">{progress}</span>
        <button
          className="icon-button"
          aria-label={sound ? "Turn sound off" : "Turn sound on"}
          title={sound ? "Countdown sounds: on" : "Countdown sounds: off"}
          onClick={onToggleSound}
        >
          {sound ? "🔊" : "🔇"}
        </button>
        <button
          className="icon-button"
          aria-label="Enter full screen"
          title="Enter or exit full screen"
          onClick={toggleFullscreen}
        >
          ↗
        </button>
      </div>
    </header>
  );
}
