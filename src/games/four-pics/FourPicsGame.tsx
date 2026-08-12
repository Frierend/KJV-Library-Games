import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GameHeader } from "../../components/GameHeader";
import { fourPicsPuzzles } from "../../data/fourPicsPuzzles";
import { useCountdown } from "../../hooks/useCountdown";
import type { TimerDuration } from "../../types/games";
import { normalizeAnswer, playTone } from "../../utils";
import {
  answerFromSlots,
  buildAnswerSlots,
  MAX_FOUR_PICS_ROUNDS,
  playerLetterCapacity,
  preparePuzzleSession,
  type PreparedPuzzle,
  removeLastPlayerLetter,
  roundCountError,
} from "./fourPicsLogic";

type GamePhase = "setup" | "play" | "complete";
type RoundResult =
  | "unchecked"
  | "checking"
  | "incorrect"
  | "correct"
  | "revealed"
  | "expired";

const durations: readonly TimerDuration[] = [10, 15, 20, 30];
const roundOptions = [5, 10, 20, 30] as const;

interface FourPicsGameProps {
  onExit: () => void;
}

export default function FourPicsGame({ onExit }: FourPicsGameProps) {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [duration, setDuration] = useState<TimerDuration>(20);
  const [roundCount, setRoundCount] = useState(5);
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState("5");
  const [prepared, setPrepared] = useState<PreparedPuzzle[] | null>(null);
  const [rounds, setRounds] = useState<PreparedPuzzle[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResultState] = useState<RoundResult>("unchecked");
  const [timerSeed, setTimerSeed] = useState(0);
  const [sound, setSound] = useState(true);
  const wrongTimeoutRef = useRef<number | null>(null);
  const wrongAttemptRef = useRef(0);
  const sessionCounterRef = useRef(0);
  const lastSoundSecond = useRef<number | null>(null);
  const resultRef = useRef<RoundResult>("unchecked");
  const canAdvanceRef = useRef(false);
  const navigationLockRef = useRef(false);
  const countdownRestartPendingRef = useRef(false);
  const gameplayHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousPhaseRef = useRef<GamePhase>(phase);

  const currentRound = rounds[index];
  const current = currentRound?.puzzle;
  const hintPositions = currentRound?.hintPositions ?? [];
  const letterTiles = currentRound?.letterTiles ?? [];
  const answer = normalizeAnswer(current?.answer ?? "");
  const roundResolved = result === "correct" || result === "revealed";
  const canAdvance = roundResolved;
  canAdvanceRef.current = canAdvance;
  const customError = customMode ? roundCountError(customDraft) : "";

  const { timeLeft, expired } = useCountdown({
    seconds: duration,
    roundKey: `${index}-${timerSeed}`,
    enabled: phase === "play" && !roundResolved,
  });

  const selectedTiles = useMemo(
    () =>
      selectedIds
        .map((id) => letterTiles.find((tile) => tile.id === id))
        .filter((tile) => tile !== undefined),
    [letterTiles, selectedIds],
  );
  const playerLetters = selectedTiles.map((tile) => tile.character);
  const answerSlots = buildAnswerSlots(
    answer,
    hintPositions,
    playerLetters,
    result === "revealed",
  );
  const enteredAnswer = answerFromSlots(answerSlots);

  useEffect(() => {
    if (previousPhaseRef.current === "setup" && phase === "play") {
      gameplayHeadingRef.current?.focus();
    }
    previousPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!sound || phase !== "play") return;
    if (timeLeft > 0 && timeLeft <= 3 && lastSoundSecond.current !== timeLeft) {
      lastSoundSecond.current = timeLeft;
      playTone(true, 760, 0.09);
    }
    if (timeLeft === 0 && lastSoundSecond.current !== 0) {
      lastSoundSecond.current = 0;
      playTone(true, 350, 0.35);
    }
  }, [phase, sound, timeLeft]);

  useEffect(() => {
    if (!expired) {
      countdownRestartPendingRef.current = false;
      return;
    }
    if (countdownRestartPendingRef.current) return;
    if (phase === "play" && expired && resultRef.current === "unchecked") {
      resultRef.current = "expired";
      setResultState("expired");
    }
  }, [expired, phase]);

  useEffect(() => {
    navigationLockRef.current = false;
  }, [index, phase]);

  useEffect(
    () => () => {
      if (wrongTimeoutRef.current !== null) {
        window.clearTimeout(wrongTimeoutRef.current);
      }
      wrongAttemptRef.current += 1;
    },
    [],
  );

  function clearWrongTimeout() {
    wrongAttemptRef.current += 1;
    if (wrongTimeoutRef.current !== null) {
      window.clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = null;
    }
  }

  function setResult(next: RoundResult) {
    resultRef.current = next;
    setResultState(next);
  }

  function resolveCount() {
    if (!customMode) return roundCount;
    if (roundCountError(customDraft)) return null;
    const value = Number(customDraft);
    setRoundCount(value);
    return value;
  }

  function makePuzzleSet(count: number) {
    sessionCounterRef.current += 1;
    return preparePuzzleSession(
      fourPicsPuzzles,
      count,
      `session-${sessionCounterRef.current}`,
    );
  }

  function preparePuzzles() {
    const count = resolveCount();
    if (count === null) return;
    setPrepared(makePuzzleSet(count));
  }

  function startGame() {
    const count = resolveCount();
    if (count === null) return;
    clearWrongTimeout();
    countdownRestartPendingRef.current = true;
    setRounds(prepared ?? makePuzzleSet(count));
    setPrepared(null);
    setIndex(0);
    setSelectedIds([]);
    setResult("unchecked");
    setTimerSeed((value) => value + 1);
    setPhase("play");
    lastSoundSecond.current = null;
  }

  function resetRound() {
    clearWrongTimeout();
    countdownRestartPendingRef.current = true;
    setSelectedIds([]);
    setResult("unchecked");
    setTimerSeed((value) => value + 1);
    lastSoundSecond.current = null;
  }

  function moveTo(nextIndex: number) {
    clearWrongTimeout();
    countdownRestartPendingRef.current = true;
    setIndex(nextIndex);
    setSelectedIds([]);
    setResult("unchecked");
    setTimerSeed((value) => value + 1);
    lastSoundSecond.current = null;
  }

  function addLetter(id: string) {
    if (
      resultRef.current !== "unchecked" ||
      expired
    ) return;
    const tile = letterTiles.find((candidate) => candidate.id === id);
    if (!tile) return;

    setSelectedIds((currentIds) => {
      if (
        currentIds.includes(id) ||
        currentIds.length >= playerLetterCapacity(answer, hintPositions)
      ) {
        return currentIds;
      }
      return [...currentIds, id];
    });
  }

  function removeLastLetter() {
    if (resultRef.current !== "unchecked" || expired) return;
    setSelectedIds((currentIds) => removeLastPlayerLetter(currentIds));
  }

  function revealAnswer() {
    clearWrongTimeout();
    setSelectedIds([]);
    setResult("revealed");
  }

  function submitAnswer() {
    if (!current || resultRef.current !== "unchecked" || expired) return;
    setResult("checking");
    const accepted = [current.answer, ...(current.acceptedAnswers ?? [])].map(
      normalizeAnswer,
    );
    if (accepted.includes(enteredAnswer)) {
      clearWrongTimeout();
      setResult("correct");
      return;
    }

    clearWrongTimeout();
    setResult("incorrect");
    const attempt = wrongAttemptRef.current;
    wrongTimeoutRef.current = window.setTimeout(() => {
      if (attempt !== wrongAttemptRef.current) return;
      setSelectedIds([]);
      setResult("unchecked");
      wrongTimeoutRef.current = null;
    }, 1_200);
  }

  function next() {
    if (!canAdvanceRef.current || navigationLockRef.current) return;
    navigationLockRef.current = true;
    if (index >= rounds.length - 1) {
      clearWrongTimeout();
      setPhase("complete");
    } else {
      moveTo(index + 1);
    }
  }

  function backToSetup() {
    clearWrongTimeout();
    setPhase("setup");
    setRounds([]);
    setSelectedIds([]);
    setResult("unchecked");
  }

  useEffect(() => {
    if (phase !== "play") return;
    const handleKey = (event: KeyboardEvent) => {
      if (
        /^[a-z]$/i.test(event.key) &&
        result === "unchecked" &&
        !expired
      ) {
        const tile = letterTiles.find(
          (candidate) =>
            candidate.character === event.key.toUpperCase() &&
            !selectedIds.includes(candidate.id),
        );
        if (tile) {
          event.preventDefault();
          addLetter(tile.id);
        }
      } else if (event.key === "Backspace") {
        event.preventDefault();
        removeLastLetter();
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (canAdvance) next();
        else submitAnswer();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (phase === "setup") {
    return (
      <main className="app-shell setup-screen setup-screen--four-pics">
        <button className="back-link" onClick={onExit}>
          <ArrowLeft aria-hidden="true" size={18} /> Back to Library
        </button>
        <section className="setup-card">
          <span className="eyebrow">Game 02</span>
          <h1>4 Pics 1 Word</h1>
          <p>Connect four Bible clues and name the word.</p>

          <div className="setup-grid">
            <fieldset className="setup-panel">
              <legend>Time Limit</legend>
              <div className="option-grid option-grid--four">
                {durations.map((seconds) => (
                  <button
                    key={seconds}
                    aria-pressed={duration === seconds}
                    className={`option-button ${duration === seconds ? "is-selected" : ""}`}
                    onClick={() => setDuration(seconds)}
                    type="button"
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="setup-panel">
              <legend>Number of Puzzles</legend>
              <div className="option-grid option-grid--rounds">
                {roundOptions.map((count) => (
                  <button
                    key={count}
                    aria-pressed={!customMode && roundCount === count}
                    className={`option-button ${!customMode && roundCount === count ? "is-selected" : ""}`}
                    onClick={() => {
                      setRoundCount(count);
                      setCustomMode(false);
                      setPrepared(null);
                    }}
                    type="button"
                  >
                    {count}
                  </button>
                ))}
                <button
                  aria-pressed={customMode}
                  className={`option-button ${customMode ? "is-selected" : ""}`}
                  onClick={() => {
                    setCustomMode(true);
                    setCustomDraft(String(roundCount));
                    setPrepared(null);
                  }}
                  type="button"
                >
                  Custom
                </button>
              </div>
              {customMode && (
                <label className="custom-field">
                  <span>Custom Number of Puzzles</span>
                  <input
                    aria-describedby="four-pics-custom-help"
                    aria-invalid={Boolean(customError)}
                    autoFocus
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max={MAX_FOUR_PICS_ROUNDS}
                    step="1"
                    value={customDraft}
                    onChange={(event) => {
                      setCustomDraft(event.target.value);
                      setPrepared(null);
                    }}
                  />
                  <small
                    className={customError ? "validation-message" : ""}
                    id="four-pics-custom-help"
                  >
                    {customError ||
                      `Choose from 1 to ${MAX_FOUR_PICS_ROUNDS}.`}
                  </small>
                </label>
              )}
            </fieldset>
          </div>

          <div className="setup-actions">
            <button
              className="button button--secondary"
              disabled={Boolean(customError)}
              onClick={preparePuzzles}
            >
              {prepared ? `${prepared.length} puzzles ready` : "Mix Puzzles"}
            </button>
            <button
              className="button button--primary"
              disabled={Boolean(customError)}
              onClick={startGame}
            >
              Start Game
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === "complete") {
    return (
      <main className="app-shell completion-screen completion-screen--four-pics">
        <section className="completion-card">
          <span className="completion-icon" aria-hidden="true">
            <CheckCircle2 />
          </span>
          <span className="eyebrow">4 Pics 1 Word</span>
          <h1>Game Complete</h1>
          <p>
            {rounds.length} {rounds.length === 1 ? "puzzle" : "puzzles"}{" "}
            completed.
          </p>
          <div className="setup-actions">
            <button className="button button--secondary" onClick={backToSetup}>
              Change Setup
            </button>
            <button className="button button--primary" onClick={startGame}>
              New Mixed Game
            </button>
            <button className="button button--ghost" onClick={onExit}>
              Back to Library
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!current) return null;

  return (
    <main className="play-shell play-shell--four-pics">
      <GameHeader
        gameName="4 Pics 1 Word"
        progress={`Round ${index + 1} of ${rounds.length}`}
        timeLeft={timeLeft}
        expired={expired}
        sound={sound}
        onToggleSound={() => setSound((value) => !value)}
        onExit={onExit}
      />

      <section aria-labelledby="quick-four-pics-round-heading" className="four-pics-board">
        <h1
          className="sr-only"
          id="quick-four-pics-round-heading"
          ref={gameplayHeadingRef}
          tabIndex={-1}
        >
          Round {index + 1}: Find the Bible word
        </h1>
        <div className="picture-grid" aria-label="Four picture clues">
          {current.clues.map((clue) => (
            <figure
              key={clue.label}
              aria-label={clue.label}
              className={`picture-clue picture-clue--${clue.tone}`}
              role="img"
            >
              {clue.scene ? (
                <span
                  aria-hidden="true"
                  className={`clue-scene clue-scene--${clue.scene}`}
                >
                  <i />
                  <i />
                  <i />
                </span>
              ) : (
                <span aria-hidden="true" className="clue-emoji">
                  {clue.emoji}
                </span>
              )}
            </figure>
          ))}
        </div>

        <div className="word-panel">
          <span className="eyebrow">Find the Bible word</span>
          <div
            className="word-slots"
            aria-label={`${answer.length} letter answer`}
          >
            {answerSlots.map((slot, slotIndex) => (
              <span
                key={slotIndex}
                aria-label={
                  slot.kind === "hint"
                    ? `Letter ${slotIndex + 1}: ${slot.character}, prefilled clue, locked`
                    : slot.character
                      ? `Letter ${slotIndex + 1}: ${slot.character}`
                      : `Letter ${slotIndex + 1}: empty`
                }
                className={[
                  `word-slot word-slot--${slot.kind}`,
                  result === "correct" ? "is-correct" : "",
                ].join(" ")}
              >
                {slot.character}
              </span>
            ))}
          </div>

          <div className="letter-bank" aria-label="Available letters">
            {letterTiles.map((tile) => {
              const selected = selectedIds.includes(tile.id);
              return (
                <button
                  key={tile.id}
                  aria-label={`Letter ${tile.character}${selected ? ", selected" : ""}`}
                  aria-pressed={selected}
                  className={selected ? "is-selected" : ""}
                  disabled={
                    selected ||
                    roundResolved ||
                    result === "incorrect" ||
                    result === "checking" ||
                    expired
                  }
                  onClick={() => addLetter(tile.id)}
                >
                  {tile.character}
                </button>
              );
            })}
          </div>

          <div className="word-actions">
            <button
              className="button button--ghost"
              disabled={
                selectedIds.length === 0 ||
                roundResolved ||
                result === "incorrect" ||
                result === "checking" ||
                expired
              }
              onClick={removeLastLetter}
            >
              Delete Last Letter
            </button>
            <button
              className="button button--primary"
              disabled={
                selectedIds.length === 0 ||
                roundResolved ||
                result === "incorrect" ||
                result === "checking" ||
                expired
              }
              onClick={submitAnswer}
            >
              Check Answer
            </button>
          </div>

          <div
            className={[
              "feedback",
              result === "incorrect" ? "feedback--wrong" : "",
              result === "expired" ? "feedback--expired" : "",
              result === "correct" ? "feedback--correct" : "",
              result === "revealed" ? "feedback--revealed" : "",
              result === "unchecked" ? "feedback--empty" : "",
            ].join(" ")}
            aria-live="polite"
          >
            {result === "checking" && <strong>Checking answer…</strong>}
            {result === "incorrect" && <strong>Try again.</strong>}
            {result === "expired" && <strong>Time’s up! Reveal the answer to continue.</strong>}
            {result === "correct" && (
              <>
                <strong>Correct! {current.answer}</strong>
                <span>{current.reference}</span>
              </>
            )}
            {result === "revealed" && (
              <>
                <strong>Answer: {current.answer}</strong>
                <span>{current.reference}</span>
              </>
            )}
          </div>
        </div>
      </section>

      <nav className="game-controls host-control-dock" aria-label="Host Controls">
        <div>
          <button className="button button--ghost" onClick={backToSetup}>
            Setup
          </button>
          <button
            className="button button--secondary"
            disabled={index === 0}
            onClick={() => moveTo(index - 1)}
          >
            <ArrowLeft aria-hidden="true" size={17} /> Previous
          </button>
        </div>
        <div>
          <button className="button button--secondary" onClick={resetRound}>
            Reset Round
          </button>
          <button
            className="button button--reveal"
            disabled={result === "revealed"}
            onClick={revealAnswer}
          >
            Reveal Answer
          </button>
        </div>
        <button
          className="button button--primary"
          disabled={!canAdvance}
          onClick={next}
        >
          {index === rounds.length - 1 ? "Finish" : <>Next <ArrowRight aria-hidden="true" size={17} /></>}
        </button>
      </nav>
    </main>
  );
}
