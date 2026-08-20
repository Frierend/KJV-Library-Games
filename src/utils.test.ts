import { afterEach, describe, expect, it, vi } from "vitest";
import {
  exitFullscreen,
  formatTimer,
  formatTimerAnnouncement,
  requestFullscreen,
} from "./utils";

const originalRequestFullscreen = Object.getOwnPropertyDescriptor(
  document.documentElement,
  "requestFullscreen",
);
const originalExitFullscreen = Object.getOwnPropertyDescriptor(document, "exitFullscreen");

afterEach(() => {
  if (originalRequestFullscreen) {
    Object.defineProperty(document.documentElement, "requestFullscreen", originalRequestFullscreen);
  } else {
    Reflect.deleteProperty(document.documentElement, "requestFullscreen");
  }
  if (originalExitFullscreen) {
    Object.defineProperty(document, "exitFullscreen", originalExitFullscreen);
  } else {
    Reflect.deleteProperty(document, "exitFullscreen");
  }
});

describe("timer formatting", () => {
  it.each([
    [300, "5:00"],
    [299, "4:59"],
    [61, "1:01"],
    [60, "1:00"],
    [59, "0:59"],
    [9, "0:09"],
    [0, "0:00"],
  ])("formats %i seconds as %s", (seconds, expected) => {
    expect(formatTimer(seconds)).toBe(expected);
  });

  it.each([
    [300, "5 minutes remaining"],
    [299, "4 minutes 59 seconds remaining"],
    [61, "1 minute 1 second remaining"],
    [60, "1 minute remaining"],
    [59, "59 seconds remaining"],
    [9, "9 seconds remaining"],
    [0, "0 seconds remaining"],
  ])("announces %i seconds as %s", (seconds, expected) => {
    expect(formatTimerAnnouncement(seconds)).toBe(expected);
  });
});

describe("fullscreen outcomes", () => {
  it("returns a rejected entry outcome without throwing", async () => {
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: vi.fn(async () => {
        throw new Error("permission denied");
      }),
    });

    await expect(requestFullscreen()).resolves.toEqual({
      action: "enter",
      status: "rejected",
    });
  });

  it("returns a rejected exit outcome without throwing", async () => {
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: vi.fn(async () => {
        throw new Error("permission denied");
      }),
    });

    await expect(exitFullscreen()).resolves.toEqual({
      action: "exit",
      status: "rejected",
    });
  });
});
