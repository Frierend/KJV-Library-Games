import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { getVerseBuilderRecord } from "../../../content/registry";
import type { RoundResult } from "../../../session/types";
import { MissingWordsBoard } from "./MissingWordsBoard";
import { tokenizeVerse, type VerseToken } from "./missingWordsEngine";

const GENESIS_1_1 = getVerseBuilderRecord("verse-builder-genesis-1-1");
if (!GENESIS_1_1) throw new Error("Reviewed Genesis 1:1 fixture is missing");
const reviewedGenesis = GENESIS_1_1;

function boardWordTokenIndex(tokens: readonly VerseToken[], word: string, occurrence = 0) {
  const matches = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.kind === "word" && token.word === word);
  const match = matches[occurrence];
  if (!match) throw new Error(`Missing reviewed word-token fixture: ${word}`);
  return match.index;
}

function Harness({
  blankWords = ["God"],
  initialDrafts = blankWords.map(() => ""),
  incorrect = [],
  result = "unchecked",
}: {
  blankWords?: readonly string[];
  initialDrafts?: readonly string[];
  incorrect?: readonly number[];
  result?: RoundResult;
}) {
  const tokens = tokenizeVerse(reviewedGenesis.canonicalText);
  const blankTokenIndices = blankWords.map((word) => boardWordTokenIndex(tokens, word));
  const [drafts, setDrafts] = useState([...initialDrafts]);
  return (
    <MissingWordsBoard
      canonicalText={reviewedGenesis.canonicalText}
      tokens={tokens}
      blankTokenIndices={blankTokenIndices}
      drafts={drafts}
      incorrectBlankIndexes={incorrect}
      onDraftChange={(blankIndex, value) => setDrafts((current) => current.map((draft, index) => index === blankIndex ? value : draft))}
      onSubmit={vi.fn()}
      reference={reviewedGenesis.reference}
      result={result}
    />
  );
}

describe("Missing Words board", () => {
  it("renders inline inputs in canonical position without exposing answers", () => {
    render(<Harness blankWords={["beginning", "created"]} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByRole("textbox", { name: `Missing word 1 of 2 in ${reviewedGenesis.reference}` })).toBeVisible();
    expect(screen.getByText(reviewedGenesis.reference)).toBeVisible();
    expect(screen.queryByText("beginning")).not.toBeInTheDocument();
    expect(screen.queryByText("created")).not.toBeInTheDocument();
  });

  it("uses a fixed-width input and disables incomplete submit", () => {
    render(<Harness blankWords={["beginning", "God", "created"]} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Submit Answer" })).toBeDisabled();
    expect(screen.getAllByRole("textbox")[0]).toHaveClass("missing-words-input");
    expect(screen.getAllByRole("textbox")[0].getAttribute("aria-label")).not.toMatch(/beginning|God|created/i);
  });

  it("preserves correct drafts and focuses the first incorrect blank", () => {
    render(<Harness blankWords={["God", "earth"]} initialDrafts={["God", "wrong"]} incorrect={[1]} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveValue("God");
    expect(inputs[1]).toHaveAttribute("aria-invalid", "true");
    expect(inputs[1]).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(/blank 2/i);
    expect(screen.getByRole("status")).not.toHaveTextContent(/world|created/i);
  });

  it("renders canonical text and no inputs after resolution", () => {
    render(<Harness result="revealed" />);
    expect(screen.getByText(reviewedGenesis.canonicalText)).toBeVisible();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.getByText(reviewedGenesis.reference)).toBeVisible();
  });
});
