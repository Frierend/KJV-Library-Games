import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FourPicsGame from "./FourPicsGame";

describe("4 Pics 1 Word", () => {
  it("clears a wrong attempt, reveals the answer, and returns to setup", async () => {
    const { container } = render(<FourPicsGame onExit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /start game/i }));
    expect(screen.getByText(/round 1 of 5/i)).toBeInTheDocument();
    expect(screen.getByText("0:20")).toBeInTheDocument();

    const firstLetter = container.querySelector<HTMLButtonElement>(
      ".letter-bank button",
    );
    expect(firstLetter).not.toBeNull();
    if (!firstLetter) return;

    fireEvent.click(firstLetter);
    fireEvent.click(screen.getByRole("button", { name: /check answer/i }));
    expect(screen.getByText("Wrong answer.")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.queryByText("Wrong answer.")).not.toBeInTheDocument();
      },
      { timeout: 2_000 },
    );
    const slots = [
      ...container.querySelectorAll<HTMLSpanElement>(".word-slots span"),
    ];
    expect(slots.every((slot) => slot.textContent === "")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /reveal answer/i }));
    expect(screen.getByText(/^Answer:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Setup" }));
    expect(screen.getByRole("button", { name: /start game/i })).toBeInTheDocument();
  });
});
