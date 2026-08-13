import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GameHeader } from "../../components/GameHeader";
import { verseBuilderContentRecords } from "../../content/registry";
import type {
  VerseBuilderContentRecord,
  VerseBuilderDifficulty,
  VerseBuilderSegment,
} from "../../content/types";
import { useCountdown } from "../../hooks/useCountdown";
import type { RoundResult } from "../../session/types";
import { playTone, shuffle } from "../../utils";
import {
  createAssemblyState,
  prepareSequence,
  revealAssembly,
  type AssemblyState,
  type AssemblySubmission,
  type PreparedSequence,
} from "../sequence/sequenceEngine";
import { VerseBuilderBoard } from "./VerseBuilderBoard";

type GamePhase = "setup" | "play" | "complete";
type DifficultyFilter = "all" | VerseBuilderDifficulty;

const countOptions = [5, 10, 15, 20] as const;
const duration = 60;

interface VerseBuilderGameProps {
  onExit: () => void;
}

function difficultyLabel(value: DifficultyFilter) {
  return value === "all" ? "All difficulties" : value[0].toUpperCase() + value.slice(1);
}

function segmentItems(segments: readonly VerseBuilderSegment[]) {
  return segments.map((segment) => ({ id: segment.id, text: segment.text }));
}

export default function VerseBuilderGame({ onExit }: VerseBuilderGameProps) {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [roundCount, setRoundCount] = useState(5);
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState("5");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [customError, setCustomError] = useState("");
  const [rounds, setRounds] = useState<VerseBuilderContentRecord[]>([]);
  const [index, setIndex] = useState(0);
  const [sequence, setSequence] = useState<PreparedSequence | null>(null);
  const [assembly, setAssembly] = useState<AssemblyState | null>(null);
  const [result, setResult] = useState<RoundResult>("unchecked");
  const [timerSeed, setTimerSeed] = useState(0);
  const [sound, setSound] = useState(true);
  const navigationLockRef = useRef(false);
  const lastSoundSecond = useRef<number | null>(null);

  const availableRecords = useMemo(
    () => difficulty === "all"
      ? verseBuilderContentRecords
      : verseBuilderContentRecords.filter((record) => record.difficulty === difficulty),
    [difficulty],
  );
  const current = rounds[index];
  const resolved = result === "correct" || result === "revealed";
  const { timeLeft, expired } = useCountdown({
    seconds: duration,
    roundKey: `${index}-${timerSeed}`,
    enabled: phase === "play" && !resolved,
  });

  useEffect(() => {
    if (phase !== "play" || !current) return;
    const nextSequence = prepareSequence(segmentItems(current.segments));
    setSequence(nextSequence);
    setAssembly(createAssemblyState(nextSequence));
    setResult("unchecked");
    lastSoundSecond.current = null;
  }, [current, phase]);

  useEffect(() => {
    if (phase !== "play") return;
    document.getElementById("session-round-heading")?.focus();
  }, [phase, index]);

  useEffect(() => {
    if (phase !== "play" || !sound) return;
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
    if (phase === "play" && expired && result === "unchecked") {
      setResult("expired");
    }
  }, [expired, phase, result]);

  useEffect(() => {
    navigationLockRef.current = false;
  }, [index, phase]);

  useEffect(() => {
    if (phase !== "play") return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        revealAnswer();
      } else if (
        (event.key === "Enter" || event.key === "ArrowRight") &&
        resolved
      ) {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        moveTo(index - 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  function resolveCount() {
    const max = availableRecords.length;
    if (!customMode) {
      if (roundCount > max) {
        setCustomError(`Only ${max} ${difficultyLabel(difficulty).toLowerCase()} ${max === 1 ? "verse is" : "verses are"} available.`);
        return null;
      }
      setCustomError("");
      return roundCount;
    }
    const value = Number(customDraft);
    if (
      customDraft.trim() === "" ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > max
    ) {
      setCustomError(
        value > max
          ? `Only ${max} ${difficultyLabel(difficulty).toLowerCase()} ${max === 1 ? "verse is" : "verses are"} available.`
          : `Choose a whole number from 1 to ${max}.`,
      );
      return null;
    }
    setCustomError("");
    setRoundCount(value);
    return value;
  }

  function startGame() {
    const count = resolveCount();
    if (count === null) return;
    setRounds(shuffle(availableRecords).slice(0, count));
    setIndex(0);
    setSequence(null);
    setAssembly(null);
    setResult("unchecked");
    setTimerSeed((value) => value + 1);
    setPhase("play");
  }

  function resetRound() {
    if (!sequence) return;
    setAssembly(createAssemblyState(sequence));
    setResult("unchecked");
    setTimerSeed((value) => value + 1);
  }

  function revealAnswer() {
    if (!sequence || !assembly || result === "revealed") return;
    setAssembly(revealAssembly(sequence, assembly));
    setResult("revealed");
  }

  function handleSubmit(submission: AssemblySubmission) {
    if (submission.outcome === "incomplete") return;
    setAssembly(submission.state);
    setResult(submission.outcome === "correct" ? "correct" : "incorrect");
  }

  function moveTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= rounds.length) return;
    setIndex(nextIndex);
    setSequence(null);
    setAssembly(null);
    setResult("unchecked");
    setTimerSeed((value) => value + 1);
  }

  function next() {
    if (!resolved || navigationLockRef.current) return;
    navigationLockRef.current = true;
    if (index >= rounds.length - 1) {
      setPhase("complete");
      return;
    }
    moveTo(index + 1);
  }

  function backToSetup() {
    setPhase("setup");
    setRounds([]);
    setSequence(null);
    setAssembly(null);
    setResult("unchecked");
  }

  if (phase === "setup") {
    return (
      <main className="app-shell setup-screen">
        <button className="back-link" onClick={onExit} type="button">
          <ArrowLeft aria-hidden="true" size={18} /> Back to Library
        </button>
        <section className="setup-card">
          <span className="eyebrow">Scripture recall</span>
          <h1>Verse Builder</h1>
          <p>Put curated KJV verse segments in the correct order.</p>

          <div className="setup-grid">
            <fieldset className="setup-panel">
              <legend>Time Limit</legend>
              <p>60 seconds per verse</p>
            </fieldset>

            <fieldset className="setup-panel">
              <legend>Number of Verses</legend>
              <div className="option-grid option-grid--three">
                {countOptions.map((count) => (
                  <button
                    aria-pressed={!customMode && roundCount === count}
                    className={`option-button ${!customMode && roundCount === count ? "is-selected" : ""}`}
                    key={count}
                    onClick={() => {
                      setRoundCount(count);
                      setCustomMode(false);
                      setCustomError("");
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
                    setCustomError("");
                  }}
                  type="button"
                >
                  Custom
                </button>
              </div>
              {customMode && (
                <label className="custom-field">
                  <span>Custom Number of Verses</span>
                  <input
                    aria-label="Custom Number of Verses"
                    aria-describedby="verse-builder-custom-total-help"
                    aria-invalid={Boolean(customError)}
                    autoFocus
                    inputMode="numeric"
                    max={availableRecords.length}
                    min="1"
                    onChange={(event) => {
                      setCustomDraft(event.target.value);
                      setCustomError("");
                    }}
                    type="number"
                    value={customDraft}
                  />
                  <small id="verse-builder-custom-total-help">
                    {customError || `Choose from 1 to ${availableRecords.length}.`}
                  </small>
                </label>
              )}
            </fieldset>

            <fieldset className="setup-panel">
              <legend>Difficulty</legend>
              <label className="custom-field">
                <span>Difficulty</span>
                <select
                  aria-label="Difficulty"
                  onChange={(event) => {
                    setDifficulty(event.target.value as DifficultyFilter);
                    setCustomError("");
                  }}
                  value={difficulty}
                >
                  <option value="all">All difficulties</option>
                  <option value="introductory">Introductory</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </fieldset>
          </div>

          <div className="setup-actions">
            <button className="button button--primary" onClick={startGame} type="button">
              Start Verse Builder
            </button>
          </div>
          {customError && <p className="validation-message" role="alert">{customError}</p>}
        </section>
      </main>
    );
  }

  if (phase === "complete") {
    return (
      <main className="app-shell completion-screen">
        <section className="completion-card">
          <span className="completion-icon"><CheckCircle2 aria-hidden="true" /></span>
          <span className="eyebrow">Verse Builder</span>
          <h1>Verse Builder Complete</h1>
          <p>{rounds.length} {rounds.length === 1 ? "verse" : "verses"} completed.</p>
          <div className="setup-actions">
            <button className="button button--secondary" onClick={backToSetup} type="button">
              Change Setup
            </button>
            <button className="button button--ghost" onClick={onExit} type="button">
              Back to Library
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!current || !sequence || !assembly) return null;

  return (
    <main className="play-shell">
      <GameHeader
        expired={expired}
        gameName="Verse Builder"
        onExit={onExit}
        onToggleSound={() => setSound((value) => !value)}
        progress={`Verse ${index + 1} of ${rounds.length}`}
        sound={sound}
        timeLeft={timeLeft}
      />

      <VerseBuilderBoard
        assembly={assembly}
        canonicalText={current.canonicalText}
        motion="system"
        onAssemblyChange={setAssembly}
        onReset={resetRound}
        onSubmit={handleSubmit}
        reference={current.referenceText}
        result={result}
        sequence={sequence}
        showReference={resolved}
      />

      <nav aria-label="Host Controls" className="game-controls host-control-dock">
        <div>
          <button className="button button--ghost" onClick={backToSetup} type="button">
            Setup
          </button>
          <button
            className="button button--secondary"
            disabled={index === 0}
            onClick={() => moveTo(index - 1)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={17} /> Previous
          </button>
        </div>
        <div>
          <button className="button button--secondary" onClick={resetRound} type="button">
            Reset Round
          </button>
          <button
            className="button button--reveal"
            disabled={result === "revealed"}
            onClick={revealAnswer}
            type="button"
          >
            Reveal Answer
          </button>
        </div>
        <button
          className="button button--primary"
          disabled={!resolved}
          onClick={next}
          type="button"
        >
          {index === rounds.length - 1 ? "Finish" : <>Next <ArrowRight aria-hidden="true" size={17} /></>}
        </button>
      </nav>
    </main>
  );
}
