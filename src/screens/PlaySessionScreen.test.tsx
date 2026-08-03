import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeScreen } from "./HomeScreen";
import { PlaySessionScreen } from "./PlaySessionScreen";
import { SessionProvider, useSession } from "../session/controller";
import { createPlaylistItem, defaultSessionConfig } from "../session/presets";
import { ACTIVE_SESSION_KEY } from "../session/storage";
import type { SessionAction } from "../session/reducer";
import type { SessionConfig } from "../session/types";

const teams: SessionConfig["teams"] = [
  { id: "team-1", name: "Blue", color: "blue" },
  { id: "team-2", name: "Gold", color: "gold" },
];

function BootstrapSession({
  actions,
  config,
}: {
  actions: readonly SessionAction[];
  config: SessionConfig;
}) {
  const { createSession, dispatch } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    const session = createSession(config);
    actions.forEach((action) => dispatch(action));
    navigate(`/play/${session.id}`);
  }, [actions, config, createSession, dispatch, navigate]);

  return null;
}

function HostedRoutes() {
  return (
    <Routes>
      <Route element={<HomeScreen />} path="/" />
      <Route element={<PlaySessionScreen />} path="/play/:sessionId" />
    </Routes>
  );
}

function renderHostedSession(
  config: SessionConfig = defaultSessionConfig,
  actions: readonly SessionAction[] = [],
) {
  return render(
    <MemoryRouter initialEntries={["/start"]}>
      <SessionProvider>
        <Routes>
          <Route element={<BootstrapSession actions={actions} config={config} />} path="/start" />
          <Route element={<HomeScreen />} path="/" />
          <Route element={<PlaySessionScreen />} path="/play/:sessionId" />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

function renderRestoredSession(sessionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/play/${sessionId}`]}>
      <SessionProvider>
        <HostedRoutes />
      </SessionProvider>
    </MemoryRouter>,
  );
}

function openLeaveDialog() {
  const opener = screen.getByTitle("Back to KJVenture");
  opener.focus();
  fireEvent.click(opener);
  expect(screen.getByRole("alertdialog", { name: "Leave this session?" })).toBeVisible();
  return opener;
}

describe("hosted session integrity", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it("freezes immediately for the leave dialog, stays frozen, and resumes after cancellation", () => {
    renderHostedSession();
    const timer = screen.getByRole("timer");

    expect(timer).toHaveTextContent("0:20");
    act(() => vi.advanceTimersByTime(1_000));
    expect(timer).toHaveTextContent("0:19");

    const opener = openLeaveDialog();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(timer).toHaveAccessibleName("19 seconds remaining, paused");

    act(() => vi.advanceTimersByTime(5_000));
    expect(timer).toHaveTextContent("0:19");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    act(() => vi.advanceTimersByTime(1_000));
    expect(timer).toHaveTextContent("0:18");
  });

  it("does not resume a timer that was already paused before the dialog opened", () => {
    renderHostedSession(defaultSessionConfig, [{ type: "TOGGLE_TIMER" }]);
    const timer = screen.getByRole("timer");
    expect(timer).toHaveAccessibleName("20 seconds remaining, paused");

    openLeaveDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    act(() => vi.advanceTimersByTime(3_000));

    expect(timer).toHaveTextContent("0:20");
    expect(timer).toHaveAccessibleName("20 seconds remaining, paused");
  });

  it.each([
    ["expired", defaultSessionConfig, [{ type: "TICK", remainingMs: 0 }] as const],
    ["resolved", defaultSessionConfig, [{ type: "REVEAL" }] as const],
    [
      "no-timer",
      {
        ...defaultSessionConfig,
        playlist: [{ ...defaultSessionConfig.playlist[0], timerSeconds: null }],
      },
      [],
    ],
  ])("does not restart a %s session after dialog dismissal", (_label, config, actions) => {
    renderHostedSession(config, actions);
    const timer = screen.getByRole("timer");
    const before = timer.textContent;

    openLeaveDialog();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    act(() => vi.advanceTimersByTime(3_000));

    expect(timer).toHaveTextContent(before ?? "");
    expect(timer).not.toHaveAccessibleName(/running/i);
  });

  it("confirms Leave with a paused recoverable snapshot", () => {
    renderHostedSession();
    openLeaveDialog();
    fireEvent.click(screen.getByRole("button", { name: "Return to Library" }));

    expect(screen.getByRole("heading", { name: "Continue Last Session" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue Session" })).toBeEnabled();
    const stored = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null");
    expect(stored.status).toBe("paused");
    expect(stored.timer.status).toBe("paused");
    expect(stored.timer.remainingMs).toBe(20_000);
  });

  it.each(["quiz", "four-pics"] as const)(
    "displays a 300-second hosted %s timer as five minutes",
    (gameId) => {
      renderHostedSession({
        ...defaultSessionConfig,
        playlist: [createPlaylistItem(gameId, 0, { roundCount: 1, order: "source", timerSeconds: 300 })],
      });

      const timer = screen.getByRole("timer");
      expect(timer).toHaveTextContent("5:00");
      expect(timer).toHaveAccessibleName("5 minutes remaining");
    },
  );

  it("counts down from 5:00, preserves the paused value, and resumes once per second", () => {
    renderHostedSession({
      ...defaultSessionConfig,
      playlist: [createPlaylistItem("quiz", 0, { roundCount: 1, order: "source", timerSeconds: 300 })],
    });
    const timer = screen.getByRole("timer");

    expect(timer).toHaveTextContent("5:00");
    act(() => vi.advanceTimersByTime(1_000));
    expect(timer).toHaveTextContent("4:59");
    expect(timer).toHaveAccessibleName("4 minutes 59 seconds remaining");

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => vi.advanceTimersByTime(3_000));
    expect(timer).toHaveTextContent("4:59");
    expect(timer).toHaveAccessibleName("4 minutes 59 seconds remaining, paused");

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    act(() => vi.advanceTimersByTime(1_000));
    expect(timer).toHaveTextContent("4:58");
    expect(timer).toHaveAccessibleName("4 minutes 58 seconds remaining");
  });

  it("displays 0:00 with an accurate accessible label at expiration", () => {
    renderHostedSession({
      ...defaultSessionConfig,
      playlist: [createPlaylistItem("quiz", 0, { roundCount: 1, order: "source", timerSeconds: 5 })],
    });
    const timer = screen.getByRole("timer");

    act(() => vi.advanceTimersByTime(5_000));
    expect(timer).toHaveTextContent("0:00");
    expect(timer).toHaveAccessibleName("0 seconds remaining");
  });

  it("explains that an allow-skip expired round can advance without a reveal", () => {
    renderHostedSession(
      {
        ...defaultSessionConfig,
        playlist: [
          createPlaylistItem("quiz", 0, {
            roundCount: 1,
            order: "source",
            timerSeconds: 5,
            expiryBehavior: "allow-skip",
          }),
        ],
      },
      [{ type: "TICK", remainingMs: 0 }],
    );

    expect(
      screen.getByText("Time’s up! You may continue or reveal the answer."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Finish" })).toBeEnabled();
  });

  it("presents an auto-revealed zero timer as expired", () => {
    renderHostedSession(
      {
        ...defaultSessionConfig,
        playlist: [
          createPlaylistItem("quiz", 0, {
            roundCount: 1,
            order: "source",
            timerSeconds: 5,
            expiryBehavior: "auto-reveal",
          }),
        ],
      },
      [{ type: "TICK", remainingMs: 0 }],
    );

    expect(screen.getByText(/^Answer:/)).toBeVisible();
    expect(screen.getByRole("timer")).toHaveTextContent("0:00");
    expect(screen.getByRole("timer")).toHaveClass("timer--expired");
  });

  it("restores the persisted millisecond timer with correct clock formatting", () => {
    const firstView = renderHostedSession(
      {
        ...defaultSessionConfig,
        playlist: [createPlaylistItem("quiz", 0, { roundCount: 1, order: "source", timerSeconds: 300 })],
      },
      [
        { type: "TICK", remainingMs: 61_000 },
        { type: "TOGGLE_TIMER" },
      ],
    );
    const saved = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null");
    expect(saved.timer.remainingMs).toBe(61_000);

    firstView.unmount();
    renderRestoredSession(saved.id);
    const timer = screen.getByRole("timer");
    expect(timer).toHaveTextContent("1:01");
    expect(timer).toHaveAccessibleName("1 minute 1 second remaining, paused");
  });

  it.each(["quiz", "four-pics"] as const)(
    "shows the no-timer state instead of a numeric hosted %s timer",
    (gameId) => {
      renderHostedSession({
        ...defaultSessionConfig,
        playlist: [createPlaylistItem(gameId, 0, { roundCount: 1, order: "source", timerSeconds: null })],
      });

      const timer = screen.getByRole("timer", { name: "No timer" });
      expect(timer).toHaveTextContent("No timer");
      expect(timer).not.toHaveTextContent(/\d+:\d+/);
    },
  );

  it.each([true, false])(
    "keeps host scoring functional when audience score visibility is %s",
    (showAudienceScores) => {
      const { container } = renderHostedSession({
        ...defaultSessionConfig,
        mode: "team",
        teams,
        showAudienceScores,
        playlist: [{ ...defaultSessionConfig.playlist[0], timerSeconds: null }],
      });
      const stage = container.querySelector<HTMLElement>(".session-game-board");
      const host = screen.getByRole("navigation", { name: "Host controls" });
      expect(stage).not.toBeNull();

      if (showAudienceScores) {
        expect(within(stage!).getByRole("region", { name: "Audience team scores" })).toBeVisible();
      } else {
        expect(within(stage!).queryByRole("region", { name: "Audience team scores" })).toBeNull();
      }
      expect(within(host).getByRole("region", { name: "Host score controls" })).toBeVisible();

      fireEvent.click(within(host).getByRole("button", { name: "Add one point to Blue" }));
      expect(within(host).getByLabelText("Blue: 1 points")).toBeVisible();
      fireEvent.click(within(host).getByRole("button", { name: "Remove one point from Blue" }));
      expect(within(host).getByLabelText("Blue: 0 points")).toBeVisible();
      fireEvent.click(within(host).getByRole("button", { name: "Add one point to Blue" }));
      fireEvent.click(within(host).getByRole("button", { name: "Undo last score change" }));
      expect(within(host).getByLabelText("Blue: 0 points")).toBeVisible();

      if (showAudienceScores) {
        expect(within(stage!).getByLabelText("Blue: 0 points")).toBeVisible();
      }
      const stored = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null");
      expect(stored.scoreEvents).toHaveLength(2);
      expect(stored.scoreEvents.map((event: { delta: number }) => event.delta)).toEqual([1, -1]);
    },
  );

  it("persists hidden scores across a Quiz-to-Four-Pics transition and restoration", () => {
    const config: SessionConfig = {
      ...defaultSessionConfig,
      mode: "team",
      teams,
      showAudienceScores: false,
      playlist: [
        createPlaylistItem("quiz", 0, { roundCount: 1, order: "source", timerSeconds: null }),
        createPlaylistItem("four-pics", 1, { roundCount: 1, order: "source", timerSeconds: null }),
      ],
    };
    const firstView = renderHostedSession(config);
    const host = screen.getByRole("navigation", { name: "Host controls" });
    fireEvent.click(within(host).getByRole("button", { name: "Add one point to Blue" }));
    fireEvent.click(within(host).getByRole("button", { name: "Reveal Answer" }));
    fireEvent.click(within(host).getByRole("button", { name: "Next" }));

    expect(document.querySelector(".four-pics-board")).toBeVisible();
    expect(within(host).getByLabelText("Blue: 1 points")).toBeVisible();
    const saved = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null");
    expect(saved.roundIndex).toBe(1);
    expect(saved.scoreEvents).toHaveLength(1);

    firstView.unmount();
    renderRestoredSession(saved.id);
    const restoredHost = screen.getByRole("navigation", { name: "Host controls" });
    expect(document.querySelector(".four-pics-board")).toBeVisible();
    expect(within(restoredHost).getByLabelText("Blue: 1 points")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Audience team scores" })).toBeNull();

    const letter = document.querySelector<HTMLButtonElement>(".letter-bank button:not([disabled])");
    expect(letter).not.toBeNull();
    fireEvent.click(letter!);
    expect(letter).toHaveAttribute("aria-pressed", "true");
  });
});
