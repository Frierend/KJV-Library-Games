import { useEffect, useMemo, useRef, useState } from "react";
import { GameHeader } from "../../components/GameHeader";
import { fourPicsPuzzles } from "../../data/fourPicsPuzzles";
import { useCountdown } from "../../hooks/useCountdown";
import type { FourPicsPuzzle, TimerDuration } from "../../types/games";
import { normalizeAnswer, playTone, shuffle } from "../../utils";

type GamePhase = "setup" | "play" | "complete";
type Feedback = "idle" | "wrong" | "correct" | "revealed";

const durations: readonly TimerDuration[] = [10, 15, 20, 30];
const roundOptions = [5, 10] as const;

interface FourPicsGameProps {
  onExit: () => void;
}

interface LetterTile {
  id: string;
  character: string;
}

export default function FourPicsGame({ onExit }: FourPicsGameProps) {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [duration, setDuration] = useState<TimerDuration>(20);
  const [roundCount, setRoundCount] = useState(5);
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState("5");
  const [customError, setCustomError] = useState("");
  const [prepared, setPrepared] = useState<FourPicsPuzzle[] | null>(null);
  const [puzzles, setPuzzles] = useState<FourPicsPuzzle[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [roundSeed, setRoundSeed] = useState(0);
  const [sound, setSound] = useState(true);
  const wrongTimeoutRef = useRef<number | null>(null);
  const lastSoundSecond = useRef<number | null>(null);

  const current = puzzles[index];
  const roundResolved = feedback === "correct" || feedback === "revealed";
  const { timeLeft, expired, restart } = useCountdown({
    seconds: duration,
    roundKey: `${index}-${roundSeed}`,
    enabled: phase === "play" && !roundResolved,
  });

  const answer = normalizeAnswer(current?.answer ?? "");
  const letterTiles = useMemo<LetterTile[]>(() => {
    if (!current) return [];
    const characters = [
      ...answer,
      ...(current.extraLetters ?? ["B", "I", "B", "L", "E"]),
    ];
    return shuffle(
      characters.map((character, tileIndex) => ({
        id: `${index}-${roundSeed}-${tileIndex}-${character}`,
        character,
      })),
    );
  }, [answer, current, index, roundSeed]);

  const selectedTiles = selectedIds
    .map((id) => letterTiles.find((tile) => tile.id === id))
    .filter((tile): tile is LetterTile => Boolean(tile));
  const enteredAnswer = selectedTiles.map((tile) => tile.character).join("");

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
    },
    [],
  );

  function resolveCount() {
    if (!customMode) return roundCount;
    const value = Number(customDraft);
    if (
      customDraft.trim() === "" ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > fourPicsPuzzles.length
    ) {
      setCustomError(`Enter a whole number from 1 to ${fourPicsPuzzles.length}.`);
      return null;
    }
    setCustomError("");
    setRoundCount(value);
    return value;
  }

  function makePuzzleSet(count: number) {
    return shuffle(fourPicsPuzzles).slice(0, count);
  }

  function preparePuzzles() {
    const count = resolveCount();
    if (count === null) return;
    setPrepared(makePuzzleSet(count));
  }

  function startGame() {
    const count = resolveCount();
    if (count === null) return;
    setPuzzles(prepared ?? makePuzzleSet(count));
    setPrepared(null);
    setIndex(0);
    setSelectedIds([]);
    setFeedback("idle");
    setRoundSeed((value) => value + 1);
    setPhase("play");
    lastSoundSecond.current = null;
  }

  function clearWrongTimeout() {
    if (wrongTimeoutRef.current !== null) {
      window.clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = null;
    }
  }

  function resetRound() {
    clearWrongTimeout();
    setSelectedIds([]);
    setFeedback("idle");
    setRoundSeed((value) => value + 1);
    lastSoundSecond.current = null;
    restart();
  }

  function moveTo(nextIndex: number) {
    clearWrongTimeout();
    setIndex(nextIndex);
    setSelectedIds([]);
    setFeedback("idle");
    setRoundSeed((value) => value + 1);
    lastSoundSecond.current = null;
  }

  function addLetter(id: string) {
    if (
      roundResolved ||
      feedback === "wrong" ||
      expired ||
      selectedIds.length >= answer.length
    ) {
      return;
    }
    if (!selectedIds.includes(id)) {
      setSelectedIds((currentIds) => [...currentIds, id]);
    }
  }

  function removeLastLetter() {
    if (roundResolved || feedback === "wrong" || expired) return;
    setSelectedIds((currentIds) => currentIds.slice(0, -1));
  }

  function submitAnswer() {
    if (!current || roundResolved || feedback === "wrong" || expired) return;
    const accepted = [current.answer, ...(current.acceptedAnswers ?? [])].map(
      normalizeAnswer,
    );
    if (accepted.includes(enteredAnswer)) {
      setFeedback("correct");
      return;
    }
    setFeedback("wrong");
    clearWrongTimeout();
    wrongTimeoutRef.current = window.setTimeout(() => {
      setSelectedIds([]);
      setFeedback("idle");
      wrongTimeoutRef.current = null;
    }, 1_200);
  }

  function next() {
    if (index >= puzzles.length - 1) {
      setPhase("complete");
    } else {
      moveTo(index + 1);
    }
  }

  function backToSetup() {
    clearWrongTimeout();
    setPhase("setup");
    setPuzzles([]);
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
        if (tile && selectedIds.length < answer.length) {
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
      <main className="app-shell setup-screen setup-screen--purple">
        <button className="back-link" onClick={onExit}>
          ← All games
        </button>
        <section className="setup-card">
          <span className="eyebrow eyebrow--purple">Game 02</span>
          <h1>4 Pics 1 Word</h1>
          <p>Connect four Bible clues and name the word.</p>

          <div className="setup-grid">
            <fieldset className="setup-panel">
              <legend>Countdown</legend>
              <div className="option-grid option-grid--four">
                {durations.map((seconds) => (
                  <button
                    key={seconds}
                    className={`option-button option-button--purple ${duration === seconds ? "is-selected" : ""}`}
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
              <div className="option-grid option-grid--three">
                {roundOptions.map((count) => (
                  <button
                    key={count}
                    className={`option-button option-button--purple ${!customMode && roundCount === count ? "is-selected" : ""}`}
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
                  className={`option-button option-button--purple ${customMode ? "is-selected" : ""}`}
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
                    autoFocus
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max={fourPicsPuzzles.length}
                    value={customDraft}
                    onChange={(event) => {
                      setCustomDraft(event.target.value);
                      setCustomError("");
                      setPrepared(null);
                    }}
                  />
                  <small>
                    {customError ||
                      `Choose from 1 to ${fourPicsPuzzles.length}.`}
                  </small>
                </label>
              )}
            </fieldset>
          </div>

          <div className="setup-actions">
            <button className="button button--secondary" onClick={preparePuzzles}>
              {prepared ? `${prepared.length} puzzles mixed ✓` : "Randomize puzzles"}
            </button>
            <button
              className="button button--primary button--purple"
              onClick={startGame}
            >
              Start Game
            </button>
          </div>
          <p className="setup-note">
            Initial content pack: {fourPicsPuzzles.length} illustrated Bible puzzles.
          </p>
        </section>
      </main>
    );
  }

  if (phase === "complete") {
    return (
      <main className="app-shell completion-screen completion-screen--purple">
        <section className="completion-card">
          <span className="completion-icon completion-icon--purple">✓</span>
          <span className="eyebrow eyebrow--purple">4 Pics 1 Word</span>
          <h1>Game Complete</h1>
          <p>
            {puzzles.length} {puzzles.length === 1 ? "puzzle" : "puzzles"}{" "}
            completed.
          </p>
          <div className="setup-actions">
            <button className="button button--secondary" onClick={backToSetup}>
              Change Setup
            </button>
            <button
              className="button button--primary button--purple"
              onClick={startGame}
            >
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

  const displayCharacters =
    roundResolved && feedback === "revealed"
      ? [...answer]
      : Array.from({ length: answer.length }, (_, slot) =>
          selectedTiles[slot]?.character ?? "",
        );

  return (
    <main className="play-shell play-shell--purple">
      <GameHeader
        gameName="4 Pics 1 Word"
        progress={`Round ${index + 1} of ${puzzles.length}`}
        timeLeft={timeLeft}
        expired={expired}
        sound={sound}
        onToggleSound={() => setSound((value) => !value)}
        onExit={onExit}
      />

      <section className="four-pics-board">
        <div className="picture-grid">
          {current.clues.map((clue) => (
            <figure
              key={clue.label}
              className={`picture-clue picture-clue--${clue.tone}`}
            >
              <span aria-hidden="true">{clue.emoji}</span>
              <figcaption>{clue.label}</figcaption>
            </figure>
          ))}
        </div>

        <div className="word-panel">
          <span className="eyebrow eyebrow--purple">Find the Bible word</span>
          <div className="word-slots" aria-label={`${answer.length} letter word`}>
            {displayCharacters.map((character, slot) => (
              <span
                key={slot}
                className={
                  feedback === "correct" || feedback === "revealed"
                    ? "is-correct"
                    : ""
                }
              >
                {character}
              </span>
            ))}
          </div>

          <div className="letter-bank" aria-label="Available letters">
            {letterTiles.map((tile) => (
              <button
                key={tile.id}
                disabled={
                  selectedIds.includes(tile.id) ||
                  roundResolved ||
                  feedback === "wrong" ||
                  expired
                }
                onClick={() => addLetter(tile.id)}
              >
                {tile.character}
              </button>
            ))}
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
              className="button button--primary button--purple"
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
              feedback === "wrong" || expired ? "feedback--wrong" : "",
              feedback === "correct" ? "feedback--correct" : "",
              feedback === "idle" && !expired ? "feedback--empty" : "",
            ].join(" ")}
            aria-live="polite"
          >
            {feedback === "wrong" && <strong>Wrong answer.</strong>}
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

      <nav className="game-controls">
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
            onClick={() => {
              setFeedback("revealed");
              setSelectedIds([]);
            }}
          >
            Reveal Answer
          </button>
        </div>
        <button
          className="button button--primary button--purple"
          onClick={next}
        >
          {index === puzzles.length - 1 ? "Finish" : "Next →"}
        </button>
      </nav>
    </main>
  );
}
