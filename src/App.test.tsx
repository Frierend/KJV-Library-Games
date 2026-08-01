import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("KJVenture application", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("opens either existing game from Explore Games", async () => {
    render(<App />);
    expect(
      screen.getByRole("heading", {
        name: /host beautiful bible game sessions anywhere/i,
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /explore games/i }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Explore Games" }),
    ).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("button", { name: /open game/i }))[0]);
    expect(
      await screen.findByRole("button", { name: /start quiz/i }),
    ).toBeInTheDocument();
  });

  it("offers a persisted hosted session after a remount", async () => {
    const firstRender = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /host a session/i }));
    fireEvent.click(await screen.findByRole("button", { name: /start session/i }));
    expect(await screen.findByText(/round 1 of 10/i)).toBeInTheDocument();

    firstRender.unmount();
    window.history.pushState({}, "", "/");
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /continue last session/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue session/i }),
    ).toBeInTheDocument();
  });
});
