import { describe, expect, it } from "vitest";
import { createSeededRandom } from "../../session/createSession";
import {
  addItem,
  availableItems,
  createAssemblyState,
  isComplete,
  isCorrect,
  moveItem,
  prepareSequence,
  removeItem,
  resetAssembly,
  revealAssembly,
  submitAssembly,
  type SequenceItem,
} from "./sequenceEngine";

const items: readonly SequenceItem[] = [
  { id: "one", text: "In the beginning" },
  { id: "two", text: "God created" },
  { id: "three", text: "the heaven and the earth." },
];

function prepared() {
  return prepareSequence(items, createSeededRandom("sequence-test"));
}

function assembledState(sequence = prepared(), ids = sequence.canonicalIds) {
  return ids.reduce(
    (state, id) => addItem(sequence, state, id),
    createAssemblyState(sequence),
  );
}

describe("Sequence/Assembly engine", () => {
  it("creates the same prepared shuffle for the same seeded random stream", () => {
    const first = prepareSequence(items, createSeededRandom("same-seed"));
    const second = prepareSequence(items, createSeededRandom("same-seed"));

    expect(first.shuffledIds).toEqual(second.shuffledIds);
    expect(first.shuffledIds).not.toEqual(first.canonicalIds);
  });

  it("prevents a two-item puzzle from starting solved", () => {
    const sequence = prepareSequence(
      [items[0], items[1]],
      () => 0.99,
    );

    expect(sequence.shuffledIds).toEqual(["two", "one"]);
  });

  it("adds an available item to the end of the arrangement", () => {
    const sequence = prepared();
    const state = addItem(sequence, createAssemblyState(sequence), "two");

    expect(state.selectedIds).toEqual(["two"]);
    expect(availableItems(sequence, state).map((item) => item.id)).toEqual([
      "one",
      "three",
    ]);
  });

  it("rejects an unknown item and duplicate add", () => {
    const sequence = prepared();
    const state = addItem(sequence, createAssemblyState(sequence), "one");

    expect(() => addItem(sequence, state, "missing")).toThrow(/unknown/i);
    expect(() => addItem(sequence, state, "one")).toThrow(/already selected/i);
  });

  it("removes a selected item", () => {
    const sequence = prepared();
    const state = assembledState(sequence, ["one", "two"]);

    expect(removeItem(sequence, state, "one").selectedIds).toEqual(["two"]);
  });

  it("moves an item earlier and later", () => {
    const sequence = prepared();
    const state = assembledState(sequence, ["one", "two", "three"]);

    const earlier = moveItem(sequence, state, "three", "earlier");
    expect(earlier.selectedIds).toEqual(["one", "three", "two"]);
    expect(moveItem(sequence, earlier, "three", "later").selectedIds).toEqual([
      "one",
      "two",
      "three",
    ]);
  });

  it("leaves boundary moves unchanged and rejects unselected moves", () => {
    const sequence = prepared();
    const state = assembledState(sequence, ["one", "two"]);

    expect(moveItem(sequence, state, "one", "earlier")).toEqual(state);
    expect(moveItem(sequence, state, "two", "later")).toEqual(state);
    expect(() => moveItem(sequence, state, "three", "earlier")).toThrow(
      /not selected/i,
    );
  });

  it("resets the arrangement and complete-submission metadata", () => {
    const sequence = prepared();
    const state = assembledState(sequence);
    const submitted = submitAssembly(sequence, state).state;

    expect(resetAssembly(sequence, submitted)).toEqual({
      selectedIds: [],
      attemptCount: 0,
      firstSubmissionCorrect: null,
    });
  });

  it("reports incomplete submissions without counting an attempt", () => {
    const sequence = prepared();
    const state = addItem(sequence, createAssemblyState(sequence), "one");
    const result = submitAssembly(sequence, state);

    expect(result.outcome).toBe("incomplete");
    expect(result.state).toEqual(state);
  });

  it("marks a first complete correct submission as eligible", () => {
    const sequence = prepared();
    const result = submitAssembly(sequence, assembledState(sequence));

    expect(result.outcome).toBe("correct");
    expect(result.state).toMatchObject({
      attemptCount: 1,
      firstSubmissionCorrect: true,
    });
    expect(result.solvedAfterRetry).toBe(false);
  });

  it("tracks a first incorrect submission and later solved-after-retry state", () => {
    const sequence = prepared();
    const wrong = assembledState(sequence, ["two", "one", "three"]);
    const first = submitAssembly(sequence, wrong);
    const corrected = moveItem(sequence, first.state, "two", "later");
    const later = submitAssembly(sequence, corrected);

    expect(first.outcome).toBe("incorrect");
    expect(first.state).toMatchObject({
      attemptCount: 1,
      firstSubmissionCorrect: false,
    });
    expect(later.outcome).toBe("correct");
    expect(later.state).toMatchObject({
      attemptCount: 2,
      firstSubmissionCorrect: false,
    });
    expect(later.solvedAfterRetry).toBe(true);
  });

  it("derives completeness and correctness from the selected IDs", () => {
    const sequence = prepared();
    const partial = addItem(sequence, createAssemblyState(sequence), "one");

    expect(isComplete(sequence, partial)).toBe(false);
    expect(isCorrect(sequence, partial)).toBe(false);
    expect(isComplete(sequence, assembledState(sequence))).toBe(true);
    expect(isCorrect(sequence, assembledState(sequence))).toBe(true);
  });

  it("reveals the canonical arrangement without changing attempt metadata", () => {
    const sequence = prepared();
    const state = assembledState(sequence, ["two", "one", "three"]);
    const revealed = revealAssembly(sequence, state);

    expect(revealed.selectedIds).toEqual(sequence.canonicalIds);
    expect(revealed.attemptCount).toBe(0);
    expect(revealed.firstSubmissionCorrect).toBeNull();
  });

  it("keeps repeated visible text distinct by stable ID", () => {
    const sequence = prepareSequence([
      { id: "a", text: "and" },
      { id: "b", text: "and" },
      { id: "c", text: "peace." },
    ], () => 0.1);
    const state = addItem(sequence, createAssemblyState(sequence), "a");

    expect(availableItems(sequence, state).map((item) => item.id)).toContain("b");
    expect(() => addItem(sequence, state, "a")).toThrow(/already selected/i);
  });

  it("rejects malformed canonical items and prepared state", () => {
    expect(() => prepareSequence([{ id: "", text: "text" }])).toThrow(/ID/i);
    expect(() => prepareSequence([
      { id: "same", text: "one" },
      { id: "same", text: "two" },
    ])).toThrow(/duplicate/i);

    const sequence = prepared();
    expect(() => availableItems(sequence, { ...createAssemblyState(sequence), selectedIds: ["missing"] })).toThrow(/unknown/i);
  });
});
