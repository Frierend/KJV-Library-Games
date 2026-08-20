import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { verseBuilderContentRecords } from "../../content/registry";
import { shuffle } from "../../utils";
import VerseBuilderGame from "./VerseBuilderGame";
import { selectMissingWordTokenIndices, tokenizeVerse } from "./missing-words/missingWordsEngine";

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

    fireEvent.click(screen.getByRole("button", { name: "Verse Order" }));
    fireEvent.change(screen.getByLabelText("Difficulty"), { target: { value: "advanced" } });
    fireEvent.click(screen.getByRole("button", { name: /^Custom$/ }));
    fireEvent.change(screen.getByLabelText("Custom Number of Verses"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Verse Builder" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/only 3 advanced verses/i);
  });

  it("starts a filtered game and renders the accessible segment board", () => {
    render(<VerseBuilderGame onExit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Verse Order" }));
    fireEvent.change(screen.getByLabelText("Difficulty"), { target: { value: "introductory" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Verse Builder" }));

    expect(screen.getByRole("region", { name: "Verse Builder" })).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("1:00");
    expect(screen.getByRole("heading", { name: "Put the verse in order" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add segment 1 of/ })).toBeInTheDocument();
  });

  it("defaults to Missing Words and explains the blank counts", () => {
    render(<VerseBuilderGame onExit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Missing Words.*Recommended/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Verse Order" })).toBeInTheDocument();
    expect(screen.getByText(/Introductory.*1 missing word/i)).toBeVisible();
    expect(screen.getByText(/Intermediate.*2 missing words/i)).toBeVisible();
    expect(screen.getByText(/Advanced.*3 missing words/i)).toBeVisible();
    for (const seconds of ["30", "45", "60", "90"]) {
      expect(screen.getByRole("button", { name: seconds })).toBeInTheDocument();
    }
  });

  it("starts Missing Words with inline blanks and a visible citation", () => {
    const deterministicRandom = () => 0;
    const expectedRecord = shuffle(verseBuilderContentRecords, deterministicRandom)[0];
    if (!expectedRecord) throw new Error("Reviewed Verse Builder pack is empty");
    render(<VerseBuilderGame onExit={vi.fn()} random={deterministicRandom} />);
    fireEvent.click(screen.getByRole("button", { name: "Start Verse Builder" }));
    expect(screen.getByRole("textbox", { name: `Missing word 1 of 1 in ${expectedRecord.reference}` })).toBeVisible();
    expect(screen.getByText(expectedRecord.reference)).toBeVisible();
    expect(screen.queryByText("Available Segments")).not.toBeInTheDocument();
  });

  it("keeps a wrong draft visible, then resolves after an exact retry", () => {
    const deterministicRandom = () => 0;
    const expectedRecord = shuffle(verseBuilderContentRecords, deterministicRandom)[0];
    if (!expectedRecord) throw new Error("Reviewed Verse Builder pack is empty");
    const tokens = tokenizeVerse(expectedRecord.canonicalText);
    const blankTokenIndex = selectMissingWordTokenIndices(tokens, expectedRecord.id, "introductory")[0];
    const blankToken = tokens[blankTokenIndex];
    if (!blankToken || blankToken.kind !== "word") throw new Error("Missing selected word fixture");

    render(<VerseBuilderGame onExit={vi.fn()} random={deterministicRandom} />);
    fireEvent.click(screen.getByRole("button", { name: "Start Verse Builder" }));
    const input = screen.getByRole("textbox", { name: `Missing word 1 of 1 in ${expectedRecord.reference}` });
    fireEvent.change(input, { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveValue("wrong");

    fireEvent.change(input, { target: { value: blankToken.word } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    expect(screen.getByText(expectedRecord.canonicalText)).toBeVisible();
  });

  it("switches to Verse Order without corrupting style-specific difficulty", () => {
    render(<VerseBuilderGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Verse Order" }));
    expect(screen.getByLabelText("Difficulty")).toHaveValue("all");
    fireEvent.click(screen.getByRole("button", { name: /Missing Words/ }));
    expect(screen.getByLabelText("Difficulty")).toHaveValue("introductory");
  });
});
