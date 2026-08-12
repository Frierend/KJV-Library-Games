import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  createAssemblyState,
  prepareSequence,
  revealAssembly,
  type AssemblyState,
  type PreparedSequence,
} from "../sequence/sequenceEngine";
import type { RoundResult } from "../../session/types";
import { VerseBuilderBoard } from "./VerseBuilderBoard";

const sequence: PreparedSequence = prepareSequence([
  { id: "one", text: "In the beginning" },
  { id: "two", text: "God created" },
  { id: "three", text: "the heaven and the earth." },
], () => 0.99);

function Harness() {
  const [assembly, setAssembly] = useState<AssemblyState>(() => createAssemblyState(sequence));
  const [result, setResult] = useState<RoundResult>("unchecked");

  return (
    <>
      <VerseBuilderBoard
        assembly={assembly}
        canonicalText="In the beginning God created the heaven and the earth."
        competitive
        motion="reduced"
        onAssemblyChange={setAssembly}
        onReset={() => {
          setAssembly(createAssemblyState(sequence));
          setResult("unchecked");
        }}
        onSubmit={(submission) => {
          setAssembly(submission.state);
          setResult(submission.outcome === "correct" ? "correct" : "incorrect");
        }}
        reference="Genesis 1:1"
        result={result}
        sequence={sequence}
        showReference={result !== "unchecked"}
      />
      <button
        onClick={() => {
          setAssembly(revealAssembly(sequence, assembly));
          setResult("revealed");
        }}
        type="button"
      >
        Test Reveal
      </button>
    </>
  );
}

function addByText(text: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`Add segment .*${text}`) }));
}

describe("Verse Builder board", () => {
  it("supports add, remove, move, reset, and explicit submit through buttons", () => {
    render(<Harness />);
    const submit = screen.getByRole("button", { name: "Submit Answer" });
    expect(submit).toBeDisabled();

    addByText("God created");
    addByText("In the beginning");
    addByText("the heaven and the earth");
    expect(submit).toBeEnabled();

    const answer = screen.getByRole("list", { name: "Your Verse in current order" });
    fireEvent.click(within(answer).getByRole("button", { name: /Move God created later/i }));
    expect(within(answer).getByText("In the beginning")).toBeInTheDocument();
    fireEvent.click(within(answer).getByRole("button", { name: /Remove the heaven/i }));
    expect(screen.getByRole("button", { name: /Add segment .*the heaven/i })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(submit).toBeDisabled();
  });

  it("keeps the arrangement editable after an incorrect submission", () => {
    render(<Harness />);
    addByText("God created");
    addByText("In the beginning");
    addByText("the heaven and the earth");
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));

    expect(screen.getByText("Try again")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Move God created later/i })).toBeEnabled();
  });

  it("shows first-attempt eligibility and solved-after-retry messaging", () => {
    const { unmount } = render(<Harness />);
    addByText("In the beginning");
    addByText("God created");
    addByText("the heaven and the earth");
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    expect(screen.getByText("Correct - eligible for +1.")).toBeInTheDocument();

    unmount();
    render(<Harness />);
    addByText("God created");
    addByText("In the beginning");
    addByText("the heaven and the earth");
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    const answer = screen.getByRole("list", { name: "Your Verse in current order" });
    fireEvent.click(within(answer).getByRole("button", { name: /Move God created later/i }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));
    expect(screen.getByText("Correct after retry - no point eligibility.")).toBeInTheDocument();
  });

  it("reveals the canonical verse and reference without requiring drag interaction", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Test Reveal" }));

    expect(screen.getByText("Answer")).toBeInTheDocument();
    expect(screen.getByText("In the beginning God created the heaven and the earth.")).toBeInTheDocument();
    expect(screen.getByText("Genesis 1:1")).toBeInTheDocument();
  });

  it("provides contextual accessible names and a reduced-motion class", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Add segment 1 of 3: In the beginning" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit Answer" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Verse Builder" })).toHaveClass(
      "verse-builder-board--reduced-motion",
    );
  });

  it("moves focus to the affected item after add, move, and remove", () => {
    render(<Harness />);
    const add = screen.getByRole("button", { name: "Add segment 1 of 3: In the beginning" });
    fireEvent.click(add);
    expect(screen.getByText("In the beginning")).toHaveFocus();

    const answer = screen.getByRole("list", { name: "Your Verse in current order" });
    fireEvent.click(within(answer).getByRole("button", { name: /Move In the beginning later/i }));
    expect(screen.getByText("In the beginning")).toHaveFocus();
    fireEvent.click(within(answer).getByRole("button", { name: /Remove In the beginning/i }));
    expect(screen.getByRole("button", { name: "Add segment 1 of 3: In the beginning" })).toHaveFocus();
  });
});
