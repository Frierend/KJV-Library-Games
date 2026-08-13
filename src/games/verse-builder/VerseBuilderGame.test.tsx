import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VerseBuilderGame from "./VerseBuilderGame";

describe("Verse Builder Quick Play", () => {
  it("offers the approved round counts and difficulty filter with a sixty-second default", () => {
    render(<VerseBuilderGame onExit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Verse Builder" })).toBeInTheDocument();
    for (const count of ["5", "10", "15", "20", "Custom"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${count}$`) })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Difficulty")).toBeInTheDocument();
    expect(screen.getByText("60 seconds per verse")).toBeInTheDocument();
  });

  it("validates a custom count against the selected difficulty", () => {
    render(<VerseBuilderGame onExit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Difficulty"), { target: { value: "advanced" } });
    fireEvent.click(screen.getByRole("button", { name: /^Custom$/ }));
    fireEvent.change(screen.getByLabelText("Custom Number of Verses"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Verse Builder" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/only 3 advanced verses/i);
  });

  it("starts a filtered game and renders the accessible segment board", () => {
    render(<VerseBuilderGame onExit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Difficulty"), { target: { value: "introductory" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Verse Builder" }));

    expect(screen.getByRole("region", { name: "Verse Builder" })).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("1:00");
    expect(screen.getByRole("heading", { name: "Put the verse in order" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add segment 1 of/ })).toBeInTheDocument();
  });
});
