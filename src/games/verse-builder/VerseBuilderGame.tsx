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
import {
  evaluateMissingWordsSubmission,
  selectMissingWordTokenIndices,
  tokenizeVerse,
  type VerseToken,
} from "./missing-words/missingWordsEngine";
import type { MissingWordsDifficulty, VerseBuilderPlayStyle, VerseOrderDifficulty } from "./verseBuilderTypes";
import { MissingWordsBoard } from "./missing-words/MissingWordsBoard";

type GamePhase = "setup" | "play" | "complete";
type DifficultyFilter = "all" | VerseBuilderDifficulty;

const countOptions = [5, 10, 15, 20] as const;
const durationOptions = [30, 45, 60, 90] as const;

export interface VerseBuilderGameProps {
  onExit: () => void;
  random?: () => number;
}

function difficultyLabel(value: DifficultyFilter) {
  return value === "all" ? "All difficulties" : value[0].toUpperCase() + value.slice(1);
}

function segmentItems(segments: readonly VerseBuilderSegment[]) {
  return segments.map((segment) => ({ id: segment.id, text: segment.text }));
}

function isTextEntryTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null;
  return Boolean(
    element &&
    (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable),
  );
}

export default function VerseBuilderGame({ onExit, random = Math.random }: VerseBuilderGameProps) {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [playStyle, setPlayStyle] = useState<VerseBuilderPlayStyle>("missing-words");
  const [roundCount, setRoundCount] = useState(5);
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState("5");
  const [missingWordsDifficulty, setMissingWordsDifficulty] = useState<MissingWordsDifficulty>("introductory");
  const [verseOrderDifficulty, setVerseOrderDifficulty] = useState<VerseOrderDifficulty>("all");
  const [duration, setDuration] = useState(60);
  const [customError, setCustomError] = useState("");
  const [rounds, setRounds] = useState<VerseBuilderContentRecord[]>([]);
  const [index, setIndex] = useState(0);
  const [sequence, setSequence] = useState<PreparedSequence | null>(null);
  const [assembly, setAssembly] = useState<AssemblyState | null>(null);
  const [missingTokens, setMissingTokens] = useState<VerseToken[]>([]);
  const [blankTokenIndices, setBlankTokenIndices] = useState<number[]>([]);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [incorrectBlankIndexes, setIncorrectBlankIndexes] = useState<number[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [firstSubmissionCorrect, setFirstSubmissionCorrect] = useState<boolean | null>(null);
  const [result, setResult] = useState<RoundResult>("unchecked");
  const [timerSeed, setTimerSeed] = useState(0);
  const [sound, setSound] = useState(true);
  const navigationLockRef = useRef(false);
  const lastSoundSecond = useRef<number | null>(null);

  const availableRecords = useMemo(
    () => playStyle === "missing-words"
      ? verseBuilderContentRecords
      : verseOrderDifficulty === "all"
        ? verseBuilderContentRecords
        : verseBuilderContentRecords.filter((record) => record.difficulty === verseOrderDifficulty),
    [playStyle, verseOrderDifficulty],
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
    setResult("unchecked");
    lastSoundSecond.current = null;
    if (playStyle === "verse-order") {
      const nextSequence = prepareSequence(segmentItems(current.segments), random);
      setSequence(nextSequence);
      setAssembly(createAssemblyState(nextSequence));
      setMissingTokens([]);
      setBlankTokenIndices([]);
      setDrafts([]);
      setIncorrectBlankIndexes([]);
      setAttemptCount(0);
      setFirstSubmissionCorrect(null);
      return;
    }
    const tokens = tokenizeVerse(current.canonicalText);
    const selectedBlankTokenIndices = selectMissingWordTokenIndices(tokens, current.id, missingWordsDifficulty);
    setMissingTokens(tokens);
    setBlankTokenIndices(selectedBlankTokenIndices);
    setDrafts(Array(selectedBlankTokenIndices.length).fill(""));
    setIncorrectBlankIndexes([]);
    setAttemptCount(0);
    setFirstSubmissionCorrect(null);
    setSequence(null);
    setAssembly(null);
  }, [current, missingWordsDifficulty, phase, playStyle, random]);

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
    if (phase === "play" && expired && result === "unchecked") setResult("expired");
  }, [expired, phase, result]);

  useEffect(() => {
    navigationLockRef.current = false;
  }, [index, phase]);

  useEffect(() => {
    if (phase !== "play") return;
    const handleKey = (event: KeyboardEvent) => {
      if (isTextEntryTarget(event.target)) return;
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        revealAnswer();
      } else if ((event.key === "Enter" || event.key === "ArrowRight") && resolved) {
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
        setCustomError(`Only ${max} ${difficultyLabel(playStyle === "verse-order" ? verseOrderDifficulty : "all").toLowerCase()} ${max === 1 ? "verse is" : "verses are"} available.`);
        return null;
      }
      setCustomError("");
      return roundCount;
    }
    const value = Number(customDraft);
    if (customDraft.trim() === "" || !Number.isInteger(value) || value < 1 || value > max) {
      setCustomError(
        value > max
          ? `Only ${max} ${difficultyLabel(playStyle === "verse-order" ? verseOrderDifficulty : "all").toLowerCase()} ${max === 1 ? "verse is" : "verses are"} available.`
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
    setRounds(shuffle(availableRecords, random).slice(0, count));
    setIndex(0);
    setSequence(null);
    setAssembly(null);
    setMissingTokens([]);
    setBlankTokenIndices([]);
    setDrafts([]);
    setIncorrectBlankIndexes([]);
    setAttemptCount(0);
    setFirstSubmissionCorrect(null);
    setResult("unchecked");
    setTimerSeed((value) => value + 1);
    setPhase("play");
  }

  function resetRound() {
    if (playStyle === "verse-order") {
      if (!sequence) return;
      setAssembly(createAssemblyState(sequence));
    } else {
      setDrafts(Array(blankTokenIndices.length).fill(""));
      setIncorrectBlankIndexes([]);
      setAttemptCount(0);
      setFirstSubmissionCorrect(null);
    }
    setResult("unchecked");
    setTimerSeed((value) => value + 1);
  }

  function revealAnswer() {
    if (result === "revealed") return;
    if (playStyle === "verse-order") {
      if (!sequence || !assembly) return;
      setAssembly(revealAssembly(sequence, assembly));
    }
    setResult("revealed");
  }

  function handleSubmit(submission: AssemblySubmission) {
    if (submission.outcome === "incomplete") return;
    setAssembly(submission.state);
    setResult(submission.outcome === "correct" ? "correct" : "incorrect");
  }

  function handleMissingDraftChange(blankIndex: number, value: string) {
    setDrafts((currentDrafts) => currentDrafts.map((draft, index) => index === blankIndex ? value : draft));
    setIncorrectBlankIndexes((currentIndexes) => currentIndexes.filter((index) => index !== blankIndex));
  }

  function submitMissingWords() {
    const submission = evaluateMissingWordsSubmission(
      missingTokens,
      blankTokenIndices,
      drafts,
      attemptCount,
      firstSubmissionCorrect,
    );
    if (submission.outcome === "incomplete") return;
    setIncorrectBlankIndexes(submission.incorrectBlankIndexes);
    setAttemptCount(submission.attemptCount);
    setFirstSubmissionCorrect(submission.firstSubmissionCorrect);
    setResult(submission.outcome === "correct" ? "correct" : "incorrect");
  }

  function moveTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= rounds.length) return;
    setIndex(nextIndex);
    setSequence(null);
    setAssembly(null);
    setMissingTokens([]);
    setBlankTokenIndices([]);
    setDrafts([]);
    setIncorrectBlankIndexes([]);
    setAttemptCount(0);
    setFirstSubmissionCorrect(null);
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
    setMissingTokens([]);
    setBlankTokenIndices([]);
    setDrafts([]);
    setIncorrectBlankIndexes([]);
    setResult("unchecked");
  }

  const difficulty = playStyle === "missing-words" ? missingWordsDifficulty : verseOrderDifficulty;

  if (phase === "setup") {
    return (
      <main className="app-shell setup-screen">
        <button className="back-link" onClick={onExit} type="button">
          <ArrowLeft aria-hidden="true" size={18} /> Back to Library
        </button>
        <section className="setup-card">
          <span className="eyebrow">Scripture recall</span>
          <h1>Verse Builder</h1>
          <p>Complete and arrange curated KJV verses to strengthen Scripture recall.</p>

          <div className="setup-grid">
            <fieldset className="setup-panel">
              <legend>Play Style</legend>
              <div className="option-grid option-grid--two">
                <button
                  aria-pressed={playStyle === "missing-words"}
                  className={`option-button ${playStyle === "missing-words" ? "is-selected" : ""}`}
                  onClick={() => { setPlayStyle("missing-words"); setCustomError(""); }}
                  type="button"
                >
                  Missing Words <span className="option-button__meta">Recommended</span>
                </button>
                <button
                  aria-pressed={playStyle === "verse-order"}
                  className={`option-button ${playStyle === "verse-order" ? "is-selected" : ""}`}
                  onClick={() => { setPlayStyle("verse-order"); setCustomError(""); }}
                  type="button"
                >
                  Verse Order
                </button>
              </div>
              <p className="setup-help">
                {playStyle === "missing-words" ? "Complete words inside the whole verse." : "Arrange the existing phrase segments."}
              </p>
            </fieldset>

            <fieldset className="setup-panel">
              <legend>Time Limit</legend>
              <div className="option-grid option-grid--four">
                {durationOptions.map((seconds) => (
                  <button
                    aria-pressed={duration === seconds}
                    className={`option-button ${duration === seconds ? "is-selected" : ""}`}
                    key={seconds}
                    onClick={() => setDuration(seconds)}
                    type="button"
                  >
                    {seconds}
                  </button>
                ))}
              </div>
              <p className="setup-help">{duration} seconds per verse</p>
            </fieldset>

            <fieldset className="setup-panel">
              <legend>Number of Verses</legend>
              <div className="option-grid option-grid--three">
                {countOptions.map((count) => (
                  <button
                    aria-pressed={!customMode && roundCount === count}
                    className={`option-button ${!customMode && roundCount === count ? "is-selected" : ""}`}
                    key={count}
                    onClick={() => { setRoundCount(count); setCustomMode(false); setCustomError(""); }}
                    type="button"
                  >
                    {count}
                  </button>
                ))}
                <button
                  aria-pressed={customMode}
                  className={`option-button ${customMode ? "is-selected" : ""}`}
                  onClick={() => { setCustomMode(true); setCustomDraft(String(roundCount)); setCustomError(""); }}
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
                    onChange={(event) => { setCustomDraft(event.target.value); setCustomError(""); }}
                    type="number"
                    value={customDraft}
                  />
                  <small id="verse-builder-custom-total-help">{customError || `Choose from 1 to ${availableRecords.length}.`}</small>
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
                    if (playStyle === "missing-words") setMissingWordsDifficulty(event.target.value as MissingWordsDifficulty);
                    else setVerseOrderDifficulty(event.target.value as VerseOrderDifficulty);
                    setCustomError("");
                  }}
                  value={difficulty}
                >
                  {playStyle === "missing-words" ? (
                    <>
                      <option value="introductory">Introductory</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </>
                  ) : (
                    <>
                      <option value="all">All difficulties</option>
                      <option value="introductory">Introductory</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </>
                  )}
                </select>
              </label>
              {playStyle === "missing-words" && (
                <ul className="setup-help-list">
                  <li>Introductory — 1 missing word</li>
                  <li>Intermediate — 2 missing words</li>
                  <li>Advanced — 3 missing words</li>
                </ul>
              )}
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
            <button className="button button--secondary" onClick={backToSetup} type="button">Change Setup</button>
            <button className="button button--ghost" onClick={onExit} type="button">Back to Library</button>
          </div>
        </section>
      </main>
    );
  }

  if (!current) return null;
  if (playStyle === "verse-order" && (!sequence || !assembly)) return null;
  if (playStyle === "missing-words" && missingTokens.length === 0) return null;

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

      {playStyle === "missing-words" ? (
        <MissingWordsBoard
          canonicalText={current.canonicalText}
          tokens={missingTokens}
          blankTokenIndices={blankTokenIndices}
          drafts={drafts}
          incorrectBlankIndexes={incorrectBlankIndexes}
          firstSubmissionCorrect={firstSubmissionCorrect}
          onDraftChange={handleMissingDraftChange}
          onSubmit={submitMissingWords}
          reference={current.referenceText}
          result={result}
        />
      ) : (
        <VerseBuilderBoard
          assembly={assembly!}
          canonicalText={current.canonicalText}
          motion="system"
          onAssemblyChange={setAssembly}
          onReset={resetRound}
          onSubmit={handleSubmit}
          reference={current.referenceText}
          result={result}
          sequence={sequence!}
          showReference={resolved}
        />
      )}

      <nav aria-label="Host Controls" className="game-controls host-control-dock">
        <div>
          <button className="button button--ghost" onClick={backToSetup} type="button">Setup</button>
          <button className="button button--secondary" disabled={index === 0} onClick={() => moveTo(index - 1)} type="button">
            <ArrowLeft aria-hidden="true" size={17} /> Previous
          </button>
        </div>
        <div>
          <button className="button button--secondary" onClick={resetRound} type="button">Reset Round</button>
          <button className="button button--reveal" disabled={result === "revealed"} onClick={revealAnswer} type="button">Reveal Answer</button>
        </div>
        <button className="button button--primary" disabled={!resolved} onClick={next} type="button">
          {index === rounds.length - 1 ? "Finish" : <>Next <ArrowRight aria-hidden="true" size={17} /></>}
        </button>
      </nav>
    </main>
  );
}
