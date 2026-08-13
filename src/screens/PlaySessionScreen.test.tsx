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
  const opener = screen.getByTitle("Back to Library");
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

  it("renders a hosted Verse Builder round from persisted segment order", () => {
    const config = {
      ...defaultSessionConfig,
      mode: "team" as const,
      teams,
      playlist: [createPlaylistItem("verse-builder", 0, {
        roundCount: 1,
        order: "source",
        timerSeconds: null,
      })],
    };
    renderHostedSession(config);

    expect(screen.getByRole("region", { name: "Verse Builder" })).toBeVisible();
    expect(screen.getByText("Put the verse in order")).toBeVisible();
    expect(screen.getByRole("region", { name: "Host Team Score Controls" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Add segment 1 of/ })).toBeEnabled();

    const stored = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null");
    const round = stored.preparedRounds[0];
    for (const [index] of round.canonicalSegmentIds.entries()) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`Add segment ${index + 1} of`) }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));

    expect(screen.getByText("Correct - eligible for +1.")).toBeVisible();
    expect(JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null").roundStates[round.id]).toMatchObject({
      result: "correct",
      firstSubmissionCorrect: true,
    });
  });

  it("restores Verse Builder using the saved arrangement and shuffle", () => {
    const config = {
      ...defaultSessionConfig,
      playlist: [createPlaylistItem("verse-builder", 0, {
        roundCount: 1,
        order: "source",
        timerSeconds: null,
      })],
    };
    const firstView = renderHostedSession(config);
    const stored = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null");
    const round = stored.preparedRounds[0];
    const firstAvailableButton = screen.getByRole("button", { name: /Add segment 1 of/ });
    const firstAvailable = firstAvailableButton.textContent;
    fireEvent.click(firstAvailableButton);
    firstView.unmount();

    renderRestoredSession(stored.id);

    expect(screen.getByRole("button", { name: /Remove/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Add segment 1 of/ })).toBeNull();
    expect(screen.getByRole("list", { name: "Your Verse in current order" })).toHaveTextContent(firstAvailable ?? "");
    expect(JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null").preparedRounds[0].shuffledSegmentIds).toEqual(round.shuffledSegmentIds);
  });

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
      screen.getByText("Time’s up! You may skip or reveal the answer."),
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

      const timer = screen.getByRole("timer", { name: "No Time Limit" });
      expect(timer).toHaveTextContent("No Time Limit");
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
      const host = screen.getByRole("navigation", { name: "Host Controls" });
      expect(stage).not.toBeNull();

      if (showAudienceScores) {
        expect(within(stage!).getByRole("region", { name: "Audience Standings" })).toBeVisible();
      } else {
        expect(within(stage!).queryByRole("region", { name: "Audience Standings" })).toBeNull();
      }
      expect(within(host).getByRole("region", { name: "Host Team Score Controls" })).toBeVisible();

      fireEvent.click(within(host).getByRole("button", { name: "Add 1 point to Blue" }));
      expect(within(host).getByLabelText("Blue: 1 points")).toBeVisible();
      fireEvent.click(within(host).getByRole("button", { name: "Subtract 1 point from Blue" }));
      expect(within(host).getByLabelText("Blue: 0 points")).toBeVisible();
      fireEvent.click(within(host).getByRole("button", { name: "Add 1 point to Blue" }));
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
    const host = screen.getByRole("navigation", { name: "Host Controls" });
    fireEvent.click(within(host).getByRole("button", { name: "Add 1 point to Blue" }));
    fireEvent.click(within(host).getByRole("button", { name: "Reveal Answer" }));
    fireEvent.click(within(host).getByRole("button", { name: "Next" }));

    expect(document.querySelector(".four-pics-board")).toBeVisible();
    expect(within(host).getByLabelText("Blue: 1 points")).toBeVisible();
    const saved = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null");
    expect(saved.roundIndex).toBe(1);
    expect(saved.scoreEvents).toHaveLength(1);

    firstView.unmount();
    renderRestoredSession(saved.id);
    const restoredHost = screen.getByRole("navigation", { name: "Host Controls" });
    expect(document.querySelector(".four-pics-board")).toBeVisible();
    expect(within(restoredHost).getByLabelText("Blue: 1 points")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Audience Standings" })).toBeNull();

    const letter = document.querySelector<HTMLButtonElement>(".letter-bank button:not([disabled])");
    expect(letter).not.toBeNull();
    fireEvent.click(letter!);
    expect(letter).toHaveAttribute("aria-pressed", "true");
  });

  it("scores individual players independently without answer-driven points and confirms a full reset", () => {
    renderHostedSession({
      ...defaultSessionConfig,
      mode: "individual",
      players: [
        { id: "player-grace", name: "Grace" },
        { id: "player-faith", name: "Faith" },
      ],
      playlist: [{ ...defaultSessionConfig.playlist[0], roundCount: 1, timerSeconds: null }],
    });
    const host = screen.getByRole("navigation", { name: "Host Controls" });
    const stage = document.querySelector<HTMLElement>(".session-game-board");
    expect(stage).not.toBeNull();
    expect(within(stage!).getByRole("region", { name: "Audience Standings" })).toBeVisible();
    expect(within(host).getByRole("region", { name: "Host Player Score Controls" })).toBeVisible();
    expect(within(host).queryByText(/^Team/)).toBeNull();

    fireEvent.click(within(host).getByRole("button", { name: "Add 1 point to Grace" }));
    fireEvent.click(within(host).getByRole("button", { name: "Add 1 point to Grace" }));
    expect(within(host).getByLabelText("Grace: 2 points")).toBeVisible();
    expect(within(host).getByLabelText("Faith: 0 points")).toBeVisible();

    fireEvent.click(within(host).getByRole("button", { name: "Reveal Answer" }));
    expect(within(host).getByLabelText("Grace: 2 points")).toBeVisible();
    fireEvent.click(within(host).getByRole("button", { name: "Reset Round" }));
    expect(within(host).getByLabelText("Grace: 2 points")).toBeVisible();

    fireEvent.click(within(host).getByRole("button", { name: "Reset all player scores" }));
    expect(screen.getByRole("alertdialog", { name: "Reset All Scores?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(within(host).getByLabelText("Grace: 2 points")).toBeVisible();

    fireEvent.click(within(host).getByRole("button", { name: "Reset all player scores" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset All Scores" }));
    expect(within(host).getByLabelText("Grace: 0 points")).toBeVisible();
    expect(JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null").scoreEvents).toEqual([]);
  });

  it("cancels or confirms an in-play Individual-to-Team change without touching round progress", () => {
    renderHostedSession({
      ...defaultSessionConfig,
      mode: "individual",
      players: [
        { id: "player-grace", name: "Grace" },
        { id: "player-faith", name: "Faith" },
      ],
      playlist: [{ ...defaultSessionConfig.playlist[0], roundCount: 2, timerSeconds: null }],
    });
    const host = screen.getByRole("navigation", { name: "Host Controls" });
    fireEvent.click(within(host).getByRole("button", { name: "Add 1 point to Grace" }));
    fireEvent.click(within(host).getByRole("button", { name: "Edit player scoring settings" }));
    fireEvent.click(screen.getByRole("button", { name: /Team Play/ }));
    expect(screen.getByRole("alertdialog", { name: "Change to Team Play?" })).toHaveTextContent("1 score change");
    fireEvent.click(screen.getByRole("button", { name: "Keep Individual Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(within(host).getByLabelText("Grace: 1 points")).toBeVisible();

    fireEvent.click(within(host).getByRole("button", { name: "Edit player scoring settings" }));
    fireEvent.click(screen.getByRole("button", { name: /Team Play/ }));
    fireEvent.click(screen.getByRole("button", { name: "Clear and Change Mode" }));
    expect(screen.getByLabelText("Team 1 name")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Save Scoring Settings" }));

    expect(within(host).getByRole("region", { name: "Host Team Score Controls" })).toBeVisible();
    expect(within(host).getByLabelText("Team 1: 0 points")).toBeVisible();
    const stored = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null");
    expect(stored.config.mode).toBe("team");
    expect(stored.config.players).toEqual([]);
    expect(stored.scoreEvents).toEqual([]);
    expect(stored.roundIndex).toBe(0);
  });

  it("confirms removal of a scored player and preserves every other score event", () => {
    renderHostedSession({
      ...defaultSessionConfig,
      mode: "individual",
      players: [
        { id: "player-grace", name: "Grace" },
        { id: "player-faith", name: "Faith" },
      ],
      playlist: [{ ...defaultSessionConfig.playlist[0], timerSeconds: null }],
    });
    const host = screen.getByRole("navigation", { name: "Host Controls" });
    fireEvent.click(within(host).getByRole("button", { name: "Add 1 point to Grace" }));
    fireEvent.click(within(host).getByRole("button", { name: "Add 1 point to Faith" }));
    fireEvent.click(within(host).getByRole("button", { name: "Edit player scoring settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Grace" }));
    expect(screen.getByRole("alertdialog", { name: "Remove Grace?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Remove Player" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Scoring Settings" }));

    expect(within(host).queryByLabelText(/Grace:/)).toBeNull();
    expect(within(host).getByLabelText("Faith: 1 points")).toBeVisible();
    const stored = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null");
    expect(stored.scoreEvents).toHaveLength(1);
    expect(stored.scoreEvents[0].competitorId).toBe("player-faith");
  });

  it("renders every tied individual winner in the final result", () => {
    renderHostedSession({
      ...defaultSessionConfig,
      mode: "individual",
      players: [
        { id: "player-a", name: "Anna" },
        { id: "player-b", name: "Beth" },
      ],
      playlist: [{ ...defaultSessionConfig.playlist[0], roundCount: 1, timerSeconds: null }],
    });
    const host = screen.getByRole("navigation", { name: "Host Controls" });
    fireEvent.click(within(host).getByRole("button", { name: "Reveal Answer" }));
    fireEvent.click(within(host).getByRole("button", { name: "Finish" }));

    expect(screen.getByRole("heading", { name: "Final Results" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Player Standings" })).toBeVisible();
    expect(screen.getByText("Joint Winners: Anna, Beth — 0 points.")).toBeVisible();
    expect(screen.getByText("Anna")).toBeVisible();
    expect(screen.getByText("Beth")).toBeVisible();
  });
});
