import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fourPicsPuzzles } from "../../data/fourPicsPuzzles";
import { normalizeAnswer } from "../../utils";
import FourPicsGame from "./FourPicsGame";

function fillCorrectAnswer(container: HTMLElement) {
  const firstClueLabel = screen.getAllByRole("img")[0].getAttribute("aria-label");
  const puzzle = fourPicsPuzzles.find(
    (candidate) => candidate.clues[0].label === firstClueLabel,
  );
  expect(puzzle).toBeDefined();
  if (!puzzle) return;

  const slots = [...container.querySelectorAll(".word-slot")];
  [...normalizeAnswer(puzzle.answer)].forEach((character, index) => {
    if (slots[index].classList.contains("word-slot--hint")) return;
    const tile = screen
      .getAllByRole("button", { name: new RegExp(`^Letter ${character}`) })
      .find((candidate) => !(candidate as HTMLButtonElement).disabled);
    expect(tile).toBeDefined();
    if (tile) fireEvent.click(tile);
  });
}

describe("4 Pics 1 Word", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.37);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("keeps accessible picture labels without displaying clue captions", () => {
    render(<FourPicsGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));

    const clues = screen.getAllByRole("img");
    expect(clues).toHaveLength(4);
    for (const clue of clues) {
      expect(clue).toHaveAttribute("aria-label");
      expect(clue.getAttribute("aria-label")).not.toBe("");
      expect(clue).not.toHaveTextContent(clue.getAttribute("aria-label") ?? "");
    }
  });

  it("moves focus to the active round heading when play starts", () => {
    render(<FourPicsGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));

    const heading = screen.getByRole("heading", {
      level: 1,
      name: /round 1: find the bible word/i,
    });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it("preserves locked hints and the letter bank when Reset Round is used", () => {
    const { container } = render(<FourPicsGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));

    const hintsBefore = [...container.querySelectorAll(".word-slot--hint")].map(
      (slot) => ({
        index: [...(slot.parentElement?.children ?? [])].indexOf(slot),
        letter: slot.textContent,
        label: slot.getAttribute("aria-label"),
      }),
    );
    const bankBefore = screen
      .getAllByRole("button", { name: /^Letter [A-Z]$/ })
      .map((button) => button.textContent);

    fireEvent.click(screen.getAllByRole("button", { name: /^Letter [A-Z]$/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: /reset round/i }));

    const hintsAfter = [...container.querySelectorAll(".word-slot--hint")].map(
      (slot) => ({
        index: [...(slot.parentElement?.children ?? [])].indexOf(slot),
        letter: slot.textContent,
        label: slot.getAttribute("aria-label"),
      }),
    );
    const bankAfter = screen
      .getAllByRole("button", { name: /^Letter [A-Z]$/ })
      .map((button) => button.textContent);

    expect(hintsAfter).toEqual(hintsBefore);
    expect(bankAfter).toEqual(bankBefore);
    expect(container.querySelectorAll(".word-slot--player")).toHaveLength(0);
  });

  it("fills the next open slot and Delete never removes a hint", () => {
    const { container } = render(<FourPicsGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));

    const hint = container.querySelector<HTMLElement>(".word-slot--hint");
    expect(hint).not.toBeNull();
    const hintText = hint?.textContent;
    const hintIndex = [
      ...(hint?.parentElement?.children ?? []),
    ].indexOf(hint as Element);

    fireEvent.click(screen.getAllByRole("button", { name: /^Letter [A-Z]$/ })[0]);
    const playerSlot = container.querySelector<HTMLElement>(".word-slot--player");
    expect(playerSlot).not.toBeNull();
    expect(
      [...(playerSlot?.parentElement?.children ?? [])].indexOf(
        playerSlot as Element,
      ),
    ).not.toBe(hintIndex);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(container.querySelectorAll(".word-slot--player")).toHaveLength(0);
    expect(hint).toHaveTextContent(hintText ?? "");
    expect(hint).toHaveClass("word-slot--hint");
  });

  it("clears only player input after a wrong attempt", async () => {
    const { container } = render(<FourPicsGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));
    const hintText = container.querySelector(".word-slot--hint")?.textContent;

    fireEvent.click(screen.getAllByRole("button", { name: /^Letter [A-Z]$/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: /check answer/i }));
    expect(screen.getByText("Try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    expect(screen.getByText(/round 1 of 5/i)).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.queryByText("Try again.")).not.toBeInTheDocument();
      },
      { timeout: 2_000 },
    );
    expect(container.querySelectorAll(".word-slot--player")).toHaveLength(0);
    expect(container.querySelector(".word-slot--hint")).toHaveTextContent(
      hintText ?? "",
    );
  });

  it("Reveal Answer completes every slot and cannot be undone by a stale wrong timeout", () => {
    vi.useFakeTimers();
    const { container } = render(<FourPicsGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));

    fireEvent.click(screen.getAllByRole("button", { name: /^Letter [A-Z]$/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: /check answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /reveal answer/i }));

    act(() => {
      vi.advanceTimersByTime(1_500);
    });

    expect(screen.getByText(/^Answer:/)).toBeInTheDocument();
    expect(
      [...container.querySelectorAll(".word-slot")].every(
        (slot) => slot.textContent !== "",
      ),
    ).toBe(true);
  });

  it("does not carry player letters through resolved Next or Previous", () => {
    const { container } = render(<FourPicsGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));
    const firstHints = [...container.querySelectorAll(".word-slot--hint")].map(
      (slot) => slot.textContent,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /^Letter [A-Z]$/ })[0]);
    expect(container.querySelectorAll(".word-slot--player")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /reveal answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/round 2 of 5/i)).toBeInTheDocument();
    expect(container.querySelectorAll(".word-slot--player")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByText(/round 1 of 5/i)).toBeInTheDocument();
    expect(container.querySelectorAll(".word-slot--player")).toHaveLength(0);
    expect(
      [...container.querySelectorAll(".word-slot--hint")].map(
        (slot) => slot.textContent,
      ),
    ).toEqual(firstHints);
  });

  it("requires Check Answer even when every entered letter is correct", () => {
    const { container } = render(<FourPicsGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));

    fillCorrectAnswer(container);

    const next = screen.getByRole("button", { name: /next/i });
    expect(next).toBeDisabled();
    expect(screen.queryByText(/correct!/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /check answer/i }));
    expect(screen.getByText(/correct!/i)).toBeInTheDocument();
    expect(next).toBeEnabled();

    fireEvent.click(next);
    expect(screen.getByText(/round 2 of 5/i)).toBeInTheDocument();
  });

  it("requires Reveal Answer after timer expiration before Next unlocks", () => {
    vi.useFakeTimers();
    render(<FourPicsGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));

    act(() => {
      vi.advanceTimersByTime(20_500);
    });

    expect(screen.getByText(/time’s up! reveal the answer/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /reveal answer/i }));
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("starts a fresh countdown when an expired round is reset", () => {
    vi.useFakeTimers();
    render(<FourPicsGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));

    act(() => {
      vi.advanceTimersByTime(20_500);
    });
    expect(screen.getByText(/time’s up! reveal the answer/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reset round/i }));
    expect(screen.queryByText(/time’s up!/i)).not.toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("0:20");

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("0:19");
    expect(screen.getAllByRole("button", { name: /^Letter [A-Z]$/ })[0]).toBeEnabled();
  });

  it("defensively rejects rapid forward navigation", () => {
    render(<FourPicsGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));
    fireEvent.click(screen.getByRole("button", { name: /reveal answer/i }));

    const next = screen.getByRole("button", { name: /next/i });
    fireEvent.click(next);
    fireEvent.click(next);
    fireEvent.keyDown(window, { key: "Enter" });

    expect(screen.getByText(/round 2 of 5/i)).toBeInTheDocument();
    expect(screen.queryByText(/round 3 of 5/i)).not.toBeInTheDocument();
  });

  it("starts a 30-round game", () => {
    render(<FourPicsGame onExit={vi.fn()} />);
    const rounds = screen.getByRole("group", { name: "Number of Puzzles" });
    fireEvent.click(within(rounds).getByRole("button", { name: "30" }));
    fireEvent.click(screen.getByRole("button", { name: /start game/i }));

    expect(screen.getByText(/round 1 of 30/i)).toBeInTheDocument();
  });

  it.each(["", "0", "-1", "1.5", "31"])(
    "blocks invalid custom round value %j",
    (value) => {
      render(<FourPicsGame onExit={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Custom" }));
      fireEvent.change(
        screen.getByRole("spinbutton", { name: /custom number of puzzles/i }),
        { target: { value } },
      );

      expect(
        screen.getByText("Enter a whole number from 1 to 30."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /start game/i }),
      ).toBeDisabled();
    },
  );
});
