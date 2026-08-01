import { GameTopBar } from "./gameplay/GameTopBar";

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
    <GameTopBar
      expired={expired}
      gameName={gameName}
      onExit={onExit}
      onToggleSound={onToggleSound}
      progress={progress}
      sound={sound}
      timeLeft={timeLeft}
    />
  );
}
