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
type Feedback = "idle" | "wrong" | "correct" | "revealed";

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
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [timerSeed, setTimerSeed] = useState(0);
  const [sound, setSound] = useState(true);
  const wrongTimeoutRef = useRef<number | null>(null);
  const wrongAttemptRef = useRef(0);
  const sessionCounterRef = useRef(0);
  const lastSoundSecond = useRef<number | null>(null);

  const currentRound = rounds[index];
  const current = currentRound?.puzzle;
  const hintPositions = currentRound?.hintPositions ?? [];
  const letterTiles = currentRound?.letterTiles ?? [];
  const answer = normalizeAnswer(current?.answer ?? "");
  const roundResolved = feedback === "correct" || feedback === "revealed";
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
    feedback === "revealed",
  );
  const enteredAnswer = answerFromSlots(answerSlots);

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
    setRounds(prepared ?? makePuzzleSet(count));
    setPrepared(null);
    setIndex(0);
    setSelectedIds([]);
    setFeedback("idle");
    setTimerSeed((value) => value + 1);
    setPhase("play");
    lastSoundSecond.current = null;
  }

  function resetRound() {
    clearWrongTimeout();
    setSelectedIds([]);
    setFeedback("idle");
    setTimerSeed((value) => value + 1);
    lastSoundSecond.current = null;
  }

  function moveTo(nextIndex: number) {
    clearWrongTimeout();
    setIndex(nextIndex);
    setSelectedIds([]);
    setFeedback("idle");
    setTimerSeed((value) => value + 1);
    lastSoundSecond.current = null;
  }

  function addLetter(id: string) {
    if (roundResolved || feedback === "wrong" || expired) return;
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
    if (roundResolved || feedback === "wrong" || expired) return;
    setSelectedIds((currentIds) => removeLastPlayerLetter(currentIds));
  }

  function revealAnswer() {
    clearWrongTimeout();
    setSelectedIds([]);
    setFeedback("revealed");
  }

  function submitAnswer() {
    if (!current || roundResolved || feedback === "wrong" || expired) return;
    const accepted = [current.answer, ...(current.acceptedAnswers ?? [])].map(
      normalizeAnswer,
    );
    if (accepted.includes(enteredAnswer)) {
      clearWrongTimeout();
      setFeedback("correct");
      return;
    }

    clearWrongTimeout();
    setFeedback("wrong");
    const attempt = wrongAttemptRef.current;
    wrongTimeoutRef.current = window.setTimeout(() => {
      if (attempt !== wrongAttemptRef.current) return;
      setSelectedIds([]);
      setFeedback("idle");
      wrongTimeoutRef.current = null;
    }, 1_200);
  }

  function next() {
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
    setFeedback("idle");
  }

  useEffect(() => {
    if (phase !== "play") return;
    const handleKey = (event: KeyboardEvent) => {
      if (
        /^[a-z]$/i.test(event.key) &&
        !roundResolved &&
        feedback !== "wrong" &&
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
        if (roundResolved) next();
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
          ← All Games
        </button>
        <section className="setup-card">
          <span className="eyebrow">Game 02</span>
          <h1>4 Pics 1 Word</h1>
          <p>Connect four Bible clues and name the word.</p>

          <div className="setup-grid">
            <fieldset className="setup-panel">
              <legend>Countdown</legend>
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
              <legend>Rounds</legend>
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
                  <span>Custom rounds</span>
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
            ✓
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
              All Games
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

      <section className="four-pics-board">
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
                  feedback === "correct" ? "is-correct" : "",
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
                    feedback === "wrong" ||
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
                feedback === "wrong" ||
                expired
              }
              onClick={removeLastLetter}
            >
              Delete
            </button>
            <button
              className="button button--primary"
              disabled={
                selectedIds.length === 0 ||
                roundResolved ||
                feedback === "wrong" ||
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
              feedback === "wrong" ? "feedback--wrong" : "",
              expired && feedback === "idle" ? "feedback--expired" : "",
              feedback === "correct" ? "feedback--correct" : "",
              feedback === "revealed" ? "feedback--revealed" : "",
              feedback === "idle" && !expired ? "feedback--empty" : "",
            ].join(" ")}
            aria-live="polite"
          >
            {feedback === "wrong" && <strong>Try again.</strong>}
            {expired && feedback === "idle" && <strong>Time’s up!</strong>}
            {feedback === "correct" && (
              <>
                <strong>Correct! {current.answer}</strong>
                <span>{current.reference}</span>
              </>
            )}
            {feedback === "revealed" && (
              <>
                <strong>Answer: {current.answer}</strong>
                <span>{current.reference}</span>
              </>
            )}
          </div>
        </div>
      </section>

      <nav className="game-controls" aria-label="Game navigation">
        <div>
          <button className="button button--ghost" onClick={backToSetup}>
            Setup
          </button>
          <button
            className="button button--secondary"
            disabled={index === 0}
            onClick={() => moveTo(index - 1)}
          >
            ← Previous
          </button>
        </div>
        <div>
          <button className="button button--secondary" onClick={resetRound}>
            Reset Round
          </button>
          <button
            className="button button--reveal"
            disabled={feedback === "revealed"}
            onClick={revealAnswer}
          >
            Reveal Answer
          </button>
        </div>
        <button className="button button--primary" onClick={next}>
          {index === rounds.length - 1 ? "Finish" : "Next →"}
        </button>
      </nav>
    </main>
  );
}
