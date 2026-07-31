import { useEffect, useState } from "react";
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
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const updateFullscreenState = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () =>
      document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  const timerState = expired ? "expired" : timeLeft <= 3 ? "warning" : "running";

  return (
    <header className="play-header">
      <button className="brand-button" onClick={onExit} title="Back to all games">
        <span className="brand-mark">✦</span>
        <span>
          <strong>{gameName}</strong>
          <small>All Games</small>
        </span>
      </button>
      <div
        aria-label={`${timeLeft} seconds remaining`}
        className={`timer timer--${timerState}`}
        role="timer"
      >
        {formatTimer(timeLeft)}
      </div>
      <div className="play-header__actions">
        <span className="progress-label">{progress}</span>
        <button
          className="icon-button"
          aria-label={sound ? "Turn sound off" : "Turn sound on"}
          aria-pressed={sound}
          title={sound ? "Countdown sounds: on" : "Countdown sounds: off"}
          onClick={onToggleSound}
        >
          {sound ? "🔊" : "🔇"}
        </button>
        <button
          className="icon-button"
          aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
          aria-pressed={fullscreen}
          title={fullscreen ? "Exit full screen" : "Enter full screen"}
          onClick={toggleFullscreen}
        >
          {fullscreen ? "↙" : "↗"}
        </button>
      </div>
    </header>
  );
}
