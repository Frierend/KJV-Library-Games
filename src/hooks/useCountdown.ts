import { useCallback, useEffect, useRef, useState } from "react";

interface CountdownOptions {
  seconds: number;
  roundKey: string | number;
  enabled: boolean;
}

export function useCountdown({
  seconds,
  roundKey,
  enabled,
}: CountdownOptions) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [restartKey, setRestartKey] = useState(0);
  const deadlineRef = useRef<number | null>(null);

  useEffect(() => {
    setTimeLeft(seconds);
    if (!enabled) {
      deadlineRef.current = null;
      return;
    }

    deadlineRef.current = Date.now() + seconds * 1_000;
    const tick = () => {
      if (deadlineRef.current === null) return;
      const next = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1_000),
      );
      setTimeLeft((current) => (current === next ? current : next));
      if (next === 0) {
        deadlineRef.current = null;
      }
    };

    tick();
    const interval = window.setInterval(tick, 200);
    return () => window.clearInterval(interval);
  }, [enabled, restartKey, roundKey, seconds]);

  const restart = useCallback(() => {
    setRestartKey((current) => current + 1);
  }, []);

  return {
    timeLeft,
    expired: timeLeft === 0,
    restart,
  };
}
