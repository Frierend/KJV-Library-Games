import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { SessionProvider } from "../session/controller";
import { ACTIVE_SESSION_KEY } from "../session/storage";
import { SessionStudioScreen } from "./SessionStudioScreen";

function renderStudio() {
  return render(
    <MemoryRouter initialEntries={["/studio"]}>
      <SessionProvider>
        <Routes>
          <Route element={<SessionStudioScreen />} path="/studio" />
          <Route element={<p>Playing</p>} path="/play/:sessionId" />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe("Session Studio scoring modes", () => {
  beforeEach(() => localStorage.clear());

  it("keeps Fellowship Mode as the default and presents the required terminology", () => {
    renderStudio();
    expect(screen.getByRole("button", { name: "Fellowship Mode Classic host-led play without scores." })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Individual Play/ })).toHaveTextContent("Everyone competes separately.");
    expect(screen.getByRole("button", { name: /Team Play/ })).toHaveTextContent("Players compete in groups.");
    expect(screen.getByLabelText("KJV Bible Quiz number of questions")).toBeVisible();
    expect(screen.getByText("Presentation Settings")).toBeVisible();
    expect(screen.getByText("Animation Level")).toBeVisible();
    expect(screen.getByText("Reduced Motion")).toBeVisible();
  });

  it("adds Verse Builder with twenty available verses and its sixty-second default", () => {
    renderStudio();

    fireEvent.click(screen.getByRole("button", { name: "Verse Builder" }));

    expect(screen.getByText("20 verses available")).toBeVisible();
    expect(screen.getByLabelText("Verse Builder number of verses")).toHaveValue(5);
    expect(screen.getByLabelText("Verse Builder time limit")).toHaveValue(60);
    expect(screen.getAllByText("Verse Builder").length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole("button", { name: /^Start Session$/ }));
    const stored = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null");
    expect(stored.config.playlist[1].gameId).toBe("verse-builder");
    expect(stored.preparedRounds[0].gameId).toBe("quiz");
    expect(stored.preparedRounds[10].gameId).toBe("verse-builder");
  });

  it("groups presentation settings without changing their stored values", () => {
    renderStudio();

    expect(screen.getByRole("group", { name: "Content Display" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Audio & Motion" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Screen & Display" })).toBeVisible();
    expect(screen.getByText("Control how the session appears and behaves when shown on a laptop, TV, or projector. These settings do not change the game content.")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Bible Reference Display"), { target: { value: "always" } });
    fireEvent.change(screen.getByLabelText("Animation Level"), { target: { value: "reduced" } });
    const soundEffects = screen.getByRole("checkbox", { name: "Enable Sound Effects" });
    fireEvent.click(soundEffects);
    expect(screen.getByRole("checkbox", { name: "Start Session in Fullscreen" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^Start Session$/ }));
    const stored = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null");
    expect(stored.config.referenceDisplay).toBe("always");
    expect(stored.config.motion).toBe("reduced");
    expect(stored.config.soundEnabled).toBe(false);
    expect(stored.config.fullscreenAtStart).toBe(false);
  });

  it("adds, edits, trims, and removes players with stable generated IDs", () => {
    renderStudio();
    fireEvent.click(screen.getByRole("button", { name: /Individual Play/ }));
    fireEvent.change(screen.getByLabelText("Player 1 name"), { target: { value: "  Mary  " } });
    fireEvent.blur(screen.getByLabelText("Player 1 name"));
    fireEvent.click(screen.getByRole("button", { name: "Add Player" }));
    fireEvent.change(screen.getByLabelText("Player 2 name"), { target: { value: "Martha" } });

    const roster = screen.getByRole("heading", { name: "Players" }).closest("section");
    expect(roster).not.toBeNull();
    expect(within(roster!).queryByText(/^Team \d/)).toBeNull();
    expect(screen.getByLabelText("Player 1 name")).toHaveValue("Mary");

    fireEvent.click(screen.getByRole("button", { name: /^Start Session$/ }));
    const stored = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? "null");
    expect(stored.config.mode).toBe("individual");
    expect(stored.config.players.map((player: { name: string }) => player.name)).toEqual(["Mary", "Martha"]);
    expect(new Set(stored.config.players.map((player: { id: string }) => player.id)).size).toBe(2);
  });

  it("rejects blank and case-insensitive duplicate player names", () => {
    renderStudio();
    fireEvent.click(screen.getByRole("button", { name: /Individual Play/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add Player" }));
    fireEvent.change(screen.getByLabelText("Player 1 name"), { target: { value: "Grace" } });
    fireEvent.change(screen.getByLabelText("Player 2 name"), { target: { value: " grace " } });

    expect(screen.getByLabelText("Player 1 name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Player 2 name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByText("This player name is already in use. Enter a different name.").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /^Start Session$/ })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Player 2 name"), { target: { value: " " } });
    expect(screen.getAllByText("Enter a player name.")[0]).toBeVisible();
    expect(screen.getByLabelText("Player 2 name")).toHaveAttribute("aria-invalid", "true");
  });

  it("cancels a mode change without losing players and clears them only after confirmation", () => {
    renderStudio();
    fireEvent.click(screen.getByRole("button", { name: /Individual Play/ }));
    fireEvent.change(screen.getByLabelText("Player 1 name"), { target: { value: "Deborah" } });
    fireEvent.click(screen.getByRole("button", { name: /Team Play/ }));

    expect(screen.getByRole("alertdialog", { name: "Change to Team Play?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByLabelText("Player 1 name")).toHaveValue("Deborah");
    expect(screen.getByRole("button", { name: /Individual Play/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /Team Play/ }));
    fireEvent.click(screen.getByRole("button", { name: "Switch to Team Play" }));
    expect(screen.queryByLabelText("Player 1 name")).toBeNull();
    expect(screen.getByLabelText("Team 1 name")).toHaveValue("Team 1");
    expect(screen.getByLabelText("Team 2 name")).toHaveValue("Team 2");
  });
});
