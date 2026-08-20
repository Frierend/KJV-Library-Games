import { audioCues } from "./services/audio";

export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

export function playTone(
  enabled: boolean,
  frequency = 760,
  duration = 0.1,
) {
  audioCues.play(enabled, frequency, duration);
}

export type FullscreenAction = "enter" | "exit";

export type FullscreenOutcome =
  | { action: FullscreenAction; status: "success" }
  | { action: FullscreenAction; status: "rejected" | "unsupported" };

export type FullscreenFailure = Exclude<FullscreenOutcome, { status: "success" }>;

export function isFullscreenFailure(value: unknown): value is FullscreenFailure {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FullscreenFailure>;
  return (
    (candidate.action === "enter" || candidate.action === "exit") &&
    (candidate.status === "rejected" || candidate.status === "unsupported")
  );
}

export function isFullscreenSupported() {
  return Boolean(
    typeof document !== "undefined" &&
      document.documentElement &&
      typeof document.documentElement.requestFullscreen === "function" &&
      typeof document.exitFullscreen === "function",
  );
}

export async function requestFullscreen(): Promise<FullscreenOutcome> {
  const element = document.documentElement;
  if (!element || typeof element.requestFullscreen !== "function") {
    return { action: "enter", status: "unsupported" };
  }

  try {
    await element.requestFullscreen();
    return { action: "enter", status: "success" };
  } catch {
    return { action: "enter", status: "rejected" };
  }
}

export async function exitFullscreen(): Promise<FullscreenOutcome> {
  if (typeof document.exitFullscreen !== "function") {
    return { action: "exit", status: "unsupported" };
  }

  try {
    await document.exitFullscreen();
    return { action: "exit", status: "success" };
  } catch {
    return { action: "exit", status: "rejected" };
  }
}

export function fullscreenFailureMessage(failure: FullscreenFailure) {
  if (failure.status === "unsupported") {
    return "Fullscreen is unavailable in this browser.";
  }
  return failure.action === "enter"
    ? "Fullscreen could not be entered. Try again."
    : "Fullscreen could not be exited. Try again.";
}

export async function toggleFullscreen(): Promise<FullscreenOutcome> {
  return document.fullscreenElement ? exitFullscreen() : requestFullscreen();
}

function wholeTimerSeconds(seconds: number) {
  return Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : 0));
}

export function formatTimer(seconds: number) {
  const totalSeconds = wholeTimerSeconds(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function formatTimerAnnouncement(seconds: number) {
  const totalSeconds = wholeTimerSeconds(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const parts: string[] = [];

  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }
  if (remainingSeconds > 0 || minutes === 0) {
    parts.push(`${remainingSeconds} ${remainingSeconds === 1 ? "second" : "seconds"}`);
  }

  return `${parts.join(" ")} remaining`;
}

export function normalizeAnswer(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
