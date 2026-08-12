import { shuffle } from "../../utils";

export interface SequenceItem {
  id: string;
  text: string;
}

export interface PreparedSequence {
  items: readonly SequenceItem[];
  canonicalIds: readonly string[];
  shuffledIds: readonly string[];
}

export interface AssemblyState {
  selectedIds: readonly string[];
  attemptCount: number;
  firstSubmissionCorrect: boolean | null;
}

export type AssemblyMoveDirection = "earlier" | "later";
export type AssemblySubmissionOutcome = "incomplete" | "incorrect" | "correct";

export interface AssemblySubmission {
  outcome: AssemblySubmissionOutcome;
  state: AssemblyState;
  solvedAfterRetry: boolean;
}

function fail(message: string): never {
  throw new Error(`Invalid sequence: ${message}`);
}

function assertPreparedSequence(sequence: PreparedSequence) {
  if (!sequence || !Array.isArray(sequence.items) || sequence.items.length === 0) {
    fail("at least one item is required.");
  }

  const itemIds = sequence.items.map((item, index) => {
    if (!item || typeof item.id !== "string" || !item.id.trim()) {
      fail(`item ${index + 1} requires a non-empty ID.`);
    }
    if (typeof item.text !== "string" || !item.text.trim()) {
      fail(`item ${item.id} requires non-empty text.`);
    }
    return item.id;
  });
  if (new Set(itemIds).size !== itemIds.length) {
    fail("canonical item IDs must be unique; duplicate IDs are not allowed.");
  }

  if (!Array.isArray(sequence.canonicalIds) ||
    sequence.canonicalIds.length !== itemIds.length ||
    sequence.canonicalIds.some((id, index) => id !== itemIds[index])) {
    fail("canonical IDs must match the ordered items.");
  }

  if (!Array.isArray(sequence.shuffledIds) ||
    sequence.shuffledIds.length !== itemIds.length ||
    new Set(sequence.shuffledIds).size !== sequence.shuffledIds.length ||
    sequence.shuffledIds.some((id) => !itemIds.includes(id))) {
    fail("shuffled IDs must contain each canonical ID exactly once.");
  }
}

function assertAssemblyState(sequence: PreparedSequence, state: AssemblyState) {
  assertPreparedSequence(sequence);
  if (!state || !Array.isArray(state.selectedIds)) {
    fail("assembly state requires selected IDs.");
  }
  if (!Number.isInteger(state.attemptCount) || state.attemptCount < 0) {
    fail("attempt count must be a non-negative integer.");
  }
  if (state.firstSubmissionCorrect !== null &&
    typeof state.firstSubmissionCorrect !== "boolean") {
    fail("first-submission correctness must be boolean or null.");
  }

  const knownIds = new Set(sequence.canonicalIds);
  if (state.selectedIds.some((id) => !knownIds.has(id))) {
    fail("selected IDs must be known canonical IDs; unknown IDs are not allowed.");
  }
  if (new Set(state.selectedIds).size !== state.selectedIds.length) {
    fail("selected IDs must not be duplicated.");
  }
}

function sameIds(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function prepareSequence(
  items: readonly SequenceItem[],
  random: () => number = Math.random,
): PreparedSequence {
  const copiedItems = items.map((item) => ({ ...item }));
  const canonicalIds = copiedItems.map((item) => item.id);
  const sequence = {
    items: copiedItems,
    canonicalIds,
    shuffledIds: shuffle(canonicalIds, random),
  };
  assertPreparedSequence(sequence);

  if (sequence.shuffledIds.length > 1 && sameIds(sequence.shuffledIds, sequence.canonicalIds)) {
    [sequence.shuffledIds[0], sequence.shuffledIds[1]] = [
      sequence.shuffledIds[1],
      sequence.shuffledIds[0],
    ];
  }
  return sequence;
}

export function createAssemblyState(sequence: PreparedSequence): AssemblyState {
  assertPreparedSequence(sequence);
  return {
    selectedIds: [],
    attemptCount: 0,
    firstSubmissionCorrect: null,
  };
}

export function availableItems(
  sequence: PreparedSequence,
  state: AssemblyState,
): SequenceItem[] {
  assertAssemblyState(sequence, state);
  const selected = new Set(state.selectedIds);
  return sequence.shuffledIds
    .filter((id) => !selected.has(id))
    .map((id) => sequence.items.find((item) => item.id === id)!);
}

export function isComplete(sequence: PreparedSequence, state: AssemblyState) {
  assertAssemblyState(sequence, state);
  return state.selectedIds.length === sequence.canonicalIds.length;
}

export function isCorrect(sequence: PreparedSequence, state: AssemblyState) {
  assertAssemblyState(sequence, state);
  return isComplete(sequence, state) && sameIds(state.selectedIds, sequence.canonicalIds);
}

export function addItem(
  sequence: PreparedSequence,
  state: AssemblyState,
  id: string,
): AssemblyState {
  assertAssemblyState(sequence, state);
  if (!sequence.canonicalIds.includes(id)) fail(`unknown item ID ${id}.`);
  if (state.selectedIds.includes(id)) fail(`item ${id} is already selected.`);
  return { ...state, selectedIds: [...state.selectedIds, id] };
}

export function removeItem(
  sequence: PreparedSequence,
  state: AssemblyState,
  id: string,
): AssemblyState {
  assertAssemblyState(sequence, state);
  if (!state.selectedIds.includes(id)) fail(`item ${id} is not selected.`);
  return { ...state, selectedIds: state.selectedIds.filter((candidate) => candidate !== id) };
}

export function moveItem(
  sequence: PreparedSequence,
  state: AssemblyState,
  id: string,
  direction: AssemblyMoveDirection,
): AssemblyState {
  assertAssemblyState(sequence, state);
  const index = state.selectedIds.indexOf(id);
  if (index < 0) fail(`item ${id} is not selected.`);
  if (direction !== "earlier" && direction !== "later") {
    fail(`move direction ${direction} is not supported.`);
  }

  const target = direction === "earlier" ? index - 1 : index + 1;
  if (target < 0 || target >= state.selectedIds.length) return state;

  const selectedIds = [...state.selectedIds];
  [selectedIds[index], selectedIds[target]] = [selectedIds[target], selectedIds[index]];
  return { ...state, selectedIds };
}

export function resetAssembly(
  sequence: PreparedSequence,
  state: AssemblyState,
): AssemblyState {
  assertAssemblyState(sequence, state);
  return createAssemblyState(sequence);
}

export function submitAssembly(
  sequence: PreparedSequence,
  state: AssemblyState,
): AssemblySubmission {
  assertAssemblyState(sequence, state);
  if (!isComplete(sequence, state)) {
    return { outcome: "incomplete", state, solvedAfterRetry: false };
  }

  const correct = isCorrect(sequence, state);
  const nextState: AssemblyState = {
    ...state,
    attemptCount: state.attemptCount + 1,
    firstSubmissionCorrect: state.firstSubmissionCorrect ?? correct,
  };
  return {
    outcome: correct ? "correct" : "incorrect",
    state: nextState,
    solvedAfterRetry: correct && nextState.attemptCount > 1,
  };
}

export function revealAssembly(
  sequence: PreparedSequence,
  state: AssemblyState,
): AssemblyState {
  assertAssemblyState(sequence, state);
  return { ...state, selectedIds: [...sequence.canonicalIds] };
}
