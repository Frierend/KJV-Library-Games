import { useEffect, useRef } from "react";
import type { ExpiryBehavior, MotionPreference, RoundResult } from "../../../session/types";
import type { VerseToken } from "./missingWordsEngine";

export interface MissingWordsBoardProps {
  canonicalText: string;
  tokens: readonly VerseToken[];
  blankTokenIndices: readonly number[];
  drafts: readonly string[];
  incorrectBlankIndexes: readonly number[];
  competitive?: boolean;
  expiryBehavior?: ExpiryBehavior;
  motion?: MotionPreference;
  firstSubmissionCorrect?: boolean | null;
  onDraftChange: (blankIndex: number, value: string) => void;
  onSubmit: () => void;
  reference: string;
  result: RoundResult;
}

function feedbackText({
  competitive,
  expiryBehavior,
  firstSubmissionCorrect,
  incorrectBlankIndexes,
  result,
}: Pick<MissingWordsBoardProps, "competitive" | "expiryBehavior" | "firstSubmissionCorrect" | "incorrectBlankIndexes" | "result">) {
  if (result === "incorrect" || (incorrectBlankIndexes.length > 0 && result === "unchecked")) {
    const ordinals = incorrectBlankIndexes.map((index) => index + 1).join(", ");
    return `Check blank${incorrectBlankIndexes.length === 1 ? "" : "s"} ${ordinals}.`;
  }
  if (result === "expired") {
    return expiryBehavior === "allow-skip"
      ? "Time's up. You may skip or reveal the answer."
      : "Time's up. Reveal the answer to continue.";
  }
  if (result === "correct") {
    if (!competitive) return "Correct!";
    return firstSubmissionCorrect
      ? "Correct - eligible for +1."
      : "Correct after retry - no point eligibility.";
  }
  if (result === "revealed") return "Answer revealed.";
  return "";
}

export function MissingWordsBoard({
  canonicalText,
  tokens,
  blankTokenIndices,
  drafts,
  incorrectBlankIndexes,
  competitive = false,
  expiryBehavior = "require-reveal",
  motion = "system",
  firstSubmissionCorrect = null,
  onDraftChange,
  onSubmit,
  reference,
  result,
}: MissingWordsBoardProps) {
  const inputRefs = useRef(new Map<number, HTMLInputElement>());
  const resolved = result === "correct" || result === "revealed";
  const blocked = resolved || result === "expired";
  const complete = blankTokenIndices.every((_, blankIndex) => Boolean((drafts[blankIndex] ?? "").trim()));
  const firstIncorrectBlank = incorrectBlankIndexes[0];
  const feedback = feedbackText({
    competitive,
    expiryBehavior,
    firstSubmissionCorrect,
    incorrectBlankIndexes,
    result,
  });

  useEffect(() => {
    if (firstIncorrectBlank === undefined) return;
    inputRefs.current.get(firstIncorrectBlank)?.focus();
  }, [firstIncorrectBlank, incorrectBlankIndexes]);

  const blankByTokenIndex = new Map(blankTokenIndices.map((tokenIndex, blankIndex) => [tokenIndex, blankIndex]));

  return (
    <section
      aria-labelledby="session-round-heading"
      className={`missing-words-board session-game-board ${motion === "reduced" ? "missing-words-board--reduced-motion" : ""}`}
      data-result={result}
    >
      <div className="missing-words-heading">
        <span className="eyebrow">Scripture recall</span>
        <h1 id="session-round-heading" tabIndex={-1}>Complete the verse</h1>
        <p className="missing-words-reference">{reference}</p>
      </div>

      {resolved ? (
        <p className="missing-words-passage missing-words-passage--resolved">{canonicalText}</p>
      ) : (
        <p className="missing-words-passage">
          {tokens.map((token, tokenIndex) => {
            if (token.kind === "separator") return <span key={`separator-${tokenIndex}`}>{token.text}</span>;
            const blankIndex = blankByTokenIndex.get(tokenIndex);
            if (blankIndex === undefined) return <span key={`word-${tokenIndex}`}>{token.raw}</span>;
            const incorrect = incorrectBlankIndexes.includes(blankIndex);
            return (
              <span className="missing-words-token" key={`blank-${tokenIndex}`}>
                {token.leadingPunctuation}
                <input
                  aria-invalid={incorrect ? "true" : undefined}
                  aria-label={`Missing word ${blankIndex + 1} of ${blankTokenIndices.length} in ${reference}`}
                  className={`missing-words-input ${incorrect ? "missing-words-input--incorrect" : ""}`}
                  disabled={blocked}
                  onChange={(event) => onDraftChange(blankIndex, event.target.value)}
                  ref={(element) => {
                    if (element) inputRefs.current.set(blankIndex, element);
                    else inputRefs.current.delete(blankIndex);
                  }}
                  type="text"
                  value={drafts[blankIndex] ?? ""}
                />
                {token.trailingPunctuation}
              </span>
            );
          })}
        </p>
      )}

      <div className="missing-words-actions">
        <button
          className="button button--primary missing-words-submit"
          disabled={blocked || !complete}
          onClick={onSubmit}
          type="button"
        >
          Submit Answer
        </button>
      </div>

      <div
        aria-atomic="true"
        aria-live="polite"
        className={`missing-words-feedback feedback ${result === "incorrect" ? "feedback--wrong" : result === "correct" ? "feedback--correct" : result === "revealed" ? "feedback--revealed" : result === "expired" ? "feedback--expired" : "feedback--empty"}`}
        role="status"
        tabIndex={-1}
      >
        {feedback && <strong>{feedback}</strong>}
        {!blocked && !complete && <span>Fill in every blank before submitting.</span>}
      </div>
    </section>
  );
}
