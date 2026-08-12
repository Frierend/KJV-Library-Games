import { AlertTriangle, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  formatTimer,
  formatTimerAnnouncement,
  fullscreenFailureMessage,
  isFullscreenSupported,
  toggleFullscreen,
  type FullscreenFailure,
} from "../../utils";
import { BrandMark } from "../ui/BrandMark";
import { IconButton } from "../ui/IconButton";

interface GameTopBarProps {
  gameName: string;
  progress: string;
  timeLeft: number | null;
  expired?: boolean;
  paused?: boolean;
  sound: boolean;
  onToggleSound: () => void;
  onExit: () => void;
  fullscreenFailure?: FullscreenFailure | null;
}

export function GameTopBar({
  gameName,
  progress,
  timeLeft,
  expired = false,
  paused = false,
  sound,
  onToggleSound,
  onExit,
  fullscreenFailure: initialFullscreenFailure = null,
}: GameTopBarProps) {
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [fullscreenAvailable, setFullscreenAvailable] = useState(isFullscreenSupported);
  const [fullscreenFailure, setFullscreenFailure] = useState<FullscreenFailure | null>(
    initialFullscreenFailure ??
      (isFullscreenSupported() ? null : { action: "enter", status: "unsupported" }),
  );
  const [fullscreenNoticeKey, setFullscreenNoticeKey] = useState(0);
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const fullscreenTransitionRef = useRef(false);

  const clearFullscreenFailure = () => {
    setFullscreenFailure(null);
    setFullscreenNoticeKey((value) => value + 1);
  };

  const showFullscreenFailure = (failure: FullscreenFailure) => {
    setFullscreenFailure(failure);
    setFullscreenNoticeKey((value) => value + 1);
  };

  const handleFullscreenToggle = async () => {
    if (fullscreenTransitionRef.current) return;
    fullscreenTransitionRef.current = true;
    const initiatingButton = fullscreenButtonRef.current;
    try {
      const outcome = await toggleFullscreen();
      if (outcome.status === "success") clearFullscreenFailure();
      else showFullscreenFailure(outcome);
      if (initiatingButton && document.contains(initiatingButton)) {
        initiatingButton.focus();
      }
    } finally {
      fullscreenTransitionRef.current = false;
    }
  };

  useEffect(() => {
    const update = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      setFullscreenAvailable(isFullscreenSupported());
    };
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const timerState = expired
    ? "expired"
    : paused
      ? "paused"
      : timeLeft !== null && timeLeft <= 3
        ? "warning"
        : "running";

  return (
    <header className="play-header game-top-bar">
      <button
        className="brand-button"
        onClick={(event) => {
          event.currentTarget.focus();
          onExit();
        }}
        title="Back to Library"
      >
        <BrandMark />
        <span>
          <strong>{gameName}</strong>
          <small>KJVenture Library</small>
        </span>
      </button>
      <div
        aria-label={
          timeLeft === null
            ? "No Time Limit"
            : `${formatTimerAnnouncement(timeLeft)}${paused ? ", paused" : ""}`
        }
        className={`timer timer--${timerState}`}
        role="timer"
      >
        {timeLeft === null ? "No Time Limit" : formatTimer(timeLeft)}
      </div>
      <div className="play-header__actions">
        <span className="progress-label">{progress}</span>
        <IconButton
          aria-pressed={sound}
          icon={sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          label={sound ? "Disable Sound Effects" : "Enable Sound Effects"}
          onClick={onToggleSound}
        />
        <IconButton
          aria-pressed={fullscreen}
          disabled={!fullscreenAvailable && !fullscreen}
          icon={fullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          label={fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          onClick={() => void handleFullscreenToggle()}
          ref={fullscreenButtonRef}
        />
      </div>
      {fullscreenFailure && (
        <div
          aria-atomic="true"
          aria-live="polite"
          className="fullscreen-feedback"
          key={fullscreenNoticeKey}
          role="status"
        >
          <AlertTriangle aria-hidden="true" size={18} />
          <span>{fullscreenFailureMessage(fullscreenFailure)}</span>
        </div>
      )}
    </header>
  );
}
