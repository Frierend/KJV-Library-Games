import { useEffect, useRef } from "react";
import {
  addItem,
  availableItems,
  isComplete,
  moveItem,
  removeItem,
  submitAssembly,
  type AssemblyMoveDirection,
  type AssemblyState,
  type AssemblySubmission,
  type PreparedSequence,
} from "../sequence/sequenceEngine";
import type { ExpiryBehavior, MotionPreference, RoundResult } from "../../session/types";

interface VerseBuilderBoardProps {
  assembly: AssemblyState;
  canonicalText: string;
  competitive?: boolean;
  expiryBehavior?: ExpiryBehavior;
  motion?: MotionPreference;
  onAssemblyChange: (state: AssemblyState) => void;
  onReset: () => void;
  onSubmit: (submission: AssemblySubmission) => void;
  reference: string;
  result: RoundResult;
  sequence: PreparedSequence;
  showReference: boolean;
}

type FocusTarget =
  | { kind: "answer" | "available"; id: string }
  | { kind: "reset" };

function resultClass(result: RoundResult) {
  if (result === "incorrect") return "feedback--wrong";
  if (result === "expired") return "feedback--expired";
  if (result === "correct") return "feedback--correct";
  if (result === "revealed") return "feedback--revealed";
  return "feedback--empty";
}

export function VerseBuilderBoard({
  assembly,
  canonicalText,
  competitive = false,
  expiryBehavior = "require-reveal",
  motion = "system",
  onAssemblyChange,
  onReset,
  onSubmit,
  reference,
  result,
  sequence,
  showReference,
}: VerseBuilderBoardProps) {
  const answerRefs = useRef(new Map<string, HTMLSpanElement>());
  const availableRefs = useRef(new Map<string, HTMLButtonElement>());
  const resetRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const focusTarget = useRef<FocusTarget | null>(null);
  const previousResult = useRef(result);
  const available = availableItems(sequence, assembly);
  const arranged = assembly.selectedIds.map(
    (id) => sequence.items.find((item) => item.id === id)!,
  );
  const complete = isComplete(sequence, assembly);
  const resolved = result === "correct" || result === "revealed";
  const blocked = resolved || result === "expired";
  const reducedMotion = motion === "reduced";

  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    focusTarget.current = null;
    if (target.kind === "reset") {
      resetRef.current?.focus();
    } else if (target.kind === "answer") {
      answerRefs.current.get(target.id)?.focus();
    } else {
      availableRefs.current.get(target.id)?.focus();
    }
  }, [assembly.selectedIds]);

  useEffect(() => {
    if (previousResult.current === result) return;
    previousResult.current = result;
    if (result !== "unchecked") feedbackRef.current?.focus();
  }, [result]);

  function updateAssembly(next: AssemblyState, target?: FocusTarget) {
    focusTarget.current = target ?? null;
    onAssemblyChange(next);
  }

  function handleMove(id: string, direction: AssemblyMoveDirection) {
    updateAssembly(moveItem(sequence, assembly, id, direction), { kind: "answer", id });
  }

  function feedback() {
    if (result === "incorrect") return <strong>Try again</strong>;
    if (result === "expired") {
      return (
        <strong>
          {expiryBehavior === "allow-skip"
            ? "Time's up. You may skip or reveal the answer."
            : "Time's up. Reveal the answer to continue."}
        </strong>
      );
    }
    if (result === "correct") {
      if (!competitive) return <strong>Correct!</strong>;
      return (
        <strong>
          {assembly.firstSubmissionCorrect
            ? "Correct - eligible for +1."
            : "Correct after retry - no point eligibility."}
        </strong>
      );
    }
    if (result === "revealed") return <strong>Answer</strong>;
    return null;
  }

  const showCanonicalVerse = result === "correct" || result === "revealed";

  return (
    <section
      aria-label="Verse Builder"
      className={`verse-builder-board session-game-board ${reducedMotion ? "verse-builder-board--reduced-motion" : ""}`}
      data-result={result}
      role="region"
    >
      <div className="verse-builder-heading">
        <span className="eyebrow">Build the KJV verse</span>
        <h1 id="session-round-heading" tabIndex={-1}>Put the verse in order</h1>
        <p>Select every segment, arrange it, then submit your answer.</p>
      </div>

      <div className="verse-builder-layout">
        <section aria-labelledby="available-segments-heading" className="verse-builder-panel">
          <div className="verse-builder-panel__heading">
            <div>
              <span className="eyebrow">Available</span>
              <h2 id="available-segments-heading">Available Segments</h2>
            </div>
            <span aria-live="polite" className="verse-builder-count">
              {assembly.selectedIds.length} of {sequence.items.length} placed
            </span>
          </div>
          <ul aria-label="Available segments" className="verse-builder-segments verse-builder-segments--available">
            {available.map((item) => {
              const position = sequence.canonicalIds.indexOf(item.id) + 1;
              return (
                <li key={item.id}>
                  <button
                    aria-label={`Add segment ${position} of ${sequence.items.length}: ${item.text}`}
                    className="verse-builder-segment-button"
                    disabled={blocked}
                    onClick={() => updateAssembly(addItem(sequence, assembly, item.id), { kind: "answer", id: item.id })}
                    ref={(element) => {
                      if (element) availableRefs.current.set(item.id, element);
                      else availableRefs.current.delete(item.id);
                    }}
                    type="button"
                  >
                    {item.text}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="your-verse-heading" className="verse-builder-panel">
          <div className="verse-builder-panel__heading">
            <div>
              <span className="eyebrow">Assembly</span>
              <h2 id="your-verse-heading">Your Verse</h2>
            </div>
            <span className="verse-builder-count">{arranged.length} segment{arranged.length === 1 ? "" : "s"}</span>
          </div>
          <ol aria-label="Your Verse in current order" className="verse-builder-segments verse-builder-segments--answer">
            {arranged.map((item, index) => {
              const position = sequence.canonicalIds.indexOf(item.id) + 1;
              return (
                <li className="verse-builder-answer-item" key={item.id}>
                  <span
                    aria-label={`Segment ${position} of ${sequence.items.length}: ${item.text}`}
                    className="verse-builder-answer-text"
                    ref={(element) => {
                      if (element) answerRefs.current.set(item.id, element);
                      else answerRefs.current.delete(item.id);
                    }}
                    tabIndex={-1}
                  >
                    {item.text}
                  </span>
                  <span className="verse-builder-answer-actions">
                    <button
                      aria-label={`Move ${item.text} earlier`}
                      disabled={blocked || index === 0}
                      onClick={() => handleMove(item.id, "earlier")}
                      type="button"
                    >
                      Earlier
                    </button>
                    <button
                      aria-label={`Move ${item.text} later`}
                      disabled={blocked || index === arranged.length - 1}
                      onClick={() => handleMove(item.id, "later")}
                      type="button"
                    >
                      Later
                    </button>
                    <button
                      aria-label={`Remove ${item.text}`}
                      disabled={blocked}
                      onClick={() => updateAssembly(removeItem(sequence, assembly, item.id), { kind: "available", id: item.id })}
                      type="button"
                    >
                      Remove
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
          {arranged.length === 0 && <p className="verse-builder-empty">Your selected segments will appear here.</p>}
          <div className="verse-builder-actions">
            <button
              className="button button--ghost"
              disabled={blocked || assembly.selectedIds.length === 0}
              onClick={() => {
                focusTarget.current = { kind: "reset" };
                onReset();
              }}
              ref={resetRef}
              type="button"
            >
              Reset
            </button>
            <button
              className="button button--primary"
              disabled={blocked || !complete}
              onClick={() => onSubmit(submitAssembly(sequence, assembly))}
              type="button"
            >
              Submit Answer
            </button>
          </div>
        </section>
      </div>

      <div
        aria-atomic="true"
        aria-live="polite"
        className={`feedback ${resultClass(result)} ${result === "unchecked" && !showReference ? "feedback--empty" : ""}`}
        ref={feedbackRef}
        tabIndex={-1}
      >
        {feedback()}
        {showCanonicalVerse && <p className="verse-builder-canonical-text">{canonicalText}</p>}
        {showReference && <span>{reference}</span>}
      </div>
    </section>
  );
}
