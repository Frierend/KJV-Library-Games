import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameTopBar } from "./GameTopBar";

const originalDocumentFullscreen = Object.getOwnPropertyDescriptor(document, "fullscreenElement");
const originalExitFullscreen = Object.getOwnPropertyDescriptor(document, "exitFullscreen");
const originalRequestFullscreen = Object.getOwnPropertyDescriptor(
  document.documentElement,
  "requestFullscreen",
);

let activeFullscreenElement: Element | null = null;

function announceFullscreenChange() {
  document.dispatchEvent(new Event("fullscreenchange"));
}

function renderTopBar() {
  return render(
    <GameTopBar
      gameName="KJV Bible Quiz"
      onExit={vi.fn()}
      onToggleSound={vi.fn()}
      progress="Round 1"
      sound
      timeLeft={60}
    />,
  );
}

beforeEach(() => {
  activeFullscreenElement = null;
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => activeFullscreenElement,
  });
  Object.defineProperty(document.documentElement, "requestFullscreen", {
    configurable: true,
    value: vi.fn(async () => {
      activeFullscreenElement = document.documentElement;
      announceFullscreenChange();
    }),
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: vi.fn(async () => {
      activeFullscreenElement = null;
      announceFullscreenChange();
    }),
  });
});

afterEach(() => {
  if (originalDocumentFullscreen) {
    Object.defineProperty(document, "fullscreenElement", originalDocumentFullscreen);
  } else {
    Reflect.deleteProperty(document, "fullscreenElement");
  }
  if (originalExitFullscreen) {
    Object.defineProperty(document, "exitFullscreen", originalExitFullscreen);
  } else {
    Reflect.deleteProperty(document, "exitFullscreen");
  }
  if (originalRequestFullscreen) {
    Object.defineProperty(
      document.documentElement,
      "requestFullscreen",
      originalRequestFullscreen,
    );
  } else {
    Reflect.deleteProperty(document.documentElement, "requestFullscreen");
  }
});

describe("GameTopBar fullscreen feedback", () => {
  it("announces a rejected entry and keeps the retry button focused", async () => {
    const request = vi.fn(async () => {
      throw new Error("denied");
    });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: request,
    });
    renderTopBar();

    const button = screen.getByRole("button", { name: "Enter full screen" });
    fireEvent.click(button);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Fullscreen could not be entered. Try again.",
    );
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveFocus();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("keeps rejected exit state accurate and retryable", async () => {
    let exitAttempts = 0;
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: vi.fn(async () => {
        exitAttempts += 1;
        if (exitAttempts === 1) throw new Error("denied");
        activeFullscreenElement = null;
        announceFullscreenChange();
      }),
    });
    renderTopBar();

    const button = screen.getByRole("button", { name: "Enter full screen" });
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveAccessibleName("Exit full screen"));
    fireEvent.click(button);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Fullscreen could not be exited. Try again.",
    );
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveFocus();

    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveAccessibleName("Enter full screen"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("disables unsupported fullscreen and explains why", () => {
    Reflect.deleteProperty(document.documentElement, "requestFullscreen");
    Reflect.deleteProperty(document, "exitFullscreen");
    renderTopBar();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Fullscreen is unavailable in this browser.",
    );
    expect(screen.getByRole("button", { name: "Enter full screen" })).toBeDisabled();
  });
});
