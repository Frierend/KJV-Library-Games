import { useEffect, useMemo, useRef, useState } from "react";
import { GameHeader } from "../../components/GameHeader";
import { quizQuestions } from "../../data/quizQuestions";
import { useCountdown } from "../../hooks/useCountdown";
import type { QuizQuestion, TimerDuration } from "../../types/games";
import { playTone, shuffle } from "../../utils";

type QuizPhase = "setup" | "play" | "complete";
type Feedback = "idle" | "wrong" | "correct" | "revealed";

const durations: readonly TimerDuration[] = [10, 15, 20, 30];
const countOptions = [10, 20, 30, 50, 100] as const;
const letters = ["A", "B", "C", "D"] as const;

interface QuizGameProps {
  onExit: () => void;
}

export default function QuizGame({ onExit }: QuizGameProps) {
  const [phase, setPhase] = useState<QuizPhase>("setup");
  const [duration, setDuration] = useState<TimerDuration>(15);
  const [questionCount, setQuestionCount] = useState(20);
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState("20");
  const [customError, setCustomError] = useState("");
  const [preparedQuestions, setPreparedQuestions] = useState<
    QuizQuestion[] | null
  >(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [roundSeed, setRoundSeed] = useState(0);
  const [sound, setSound] = useState(true);
  const wrongTimeoutRef = useRef<number | null>(null);
  const lastSoundSecond = useRef<number | null>(null);

  const roundResolved = feedback === "correct" || feedback === "revealed";
  const { timeLeft, expired, restart } = useCountdown({
    seconds: duration,
    roundKey: `${index}-${roundSeed}`,
    enabled: phase === "play" && !roundResolved,
  });

  const current = questions[index];

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
    if (!customMode) return questionCount;
    const value = Number(customDraft);
    if (
      customDraft.trim() === "" ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > quizQuestions.length
    ) {
      setCustomError("Enter a whole number from 1 to 100.");
      return null;
    }
    setCustomError("");
    setQuestionCount(value);
    return value;
  }

  function makeQuestionSet(count: number) {
    return shuffle(quizQuestions).slice(0, count);
  }

  function prepareQuestions() {
    const count = resolveCount();
    if (count === null) return;
    setPreparedQuestions(makeQuestionSet(count));
  }

  function startGame() {
    const count = resolveCount();
    if (count === null) return;
    setQuestions(preparedQuestions ?? makeQuestionSet(count));
    setPreparedQuestions(null);
    setIndex(0);
    setFeedback("idle");
    setWrongIndex(null);
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

  function resetQuestion() {
    clearWrongTimeout();
    setFeedback("idle");
    setWrongIndex(null);
    setRoundSeed((value) => value + 1);
    lastSoundSecond.current = null;
    restart();
  }

  function revealAnswer() {
    clearWrongTimeout();
    setWrongIndex(null);
    setFeedback("revealed");
  }

  function moveTo(nextIndex: number) {
    clearWrongTimeout();
    setIndex(nextIndex);
    setFeedback("idle");
    setWrongIndex(null);
    setRoundSeed((value) => value + 1);
    lastSoundSecond.current = null;
  }

  function selectAnswer(choiceIndex: number) {
    if (!current || roundResolved || expired || wrongIndex !== null) return;
    if (choiceIndex === current.correctIndex) {
      setFeedback("correct");
      return;
    }
    setWrongIndex(choiceIndex);
    setFeedback("wrong");
    wrongTimeoutRef.current = window.setTimeout(() => {
      setWrongIndex(null);
      setFeedback("idle");
      wrongTimeoutRef.current = null;
    }, 1_200);
  }

  function next() {
    if (index >= questions.length - 1) {
      setPhase("complete");
      return;
    }
    moveTo(index + 1);
  }

  function backToSetup() {
    clearWrongTimeout();
    setPhase("setup");
    setFeedback("idle");
    setWrongIndex(null);
    setQuestions([]);
  }

  useEffect(() => {
    if (phase !== "play") return;
    const handleKey = (event: KeyboardEvent) => {
      const choice = ["a", "b", "c", "d"].indexOf(event.key.toLowerCase());
      if (choice >= 0) {
        event.preventDefault();
        selectAnswer(choice);
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        revealAnswer();
      } else if (
        roundResolved &&
        (event.key === "Enter" || event.key === "ArrowRight")
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

  const setupSummary = useMemo(
    () =>
      preparedQuestions
        ? `${preparedQuestions.length} questions mixed ✓`
        : "Randomize questions",
    [preparedQuestions],
  );

  if (phase === "setup") {
    return (
      <main className="app-shell setup-screen">
        <button className="back-link" onClick={onExit}>
          ← All Games
        </button>
        <section className="setup-card">
          <span className="eyebrow">Game 01</span>
          <h1>KJV Bible Quiz</h1>
          <p>First hands up, first to answer.</p>

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
              <legend>Questions</legend>
              <div className="option-grid option-grid--three">
                {countOptions.map((count) => (
                  <button
                    key={count}
                    aria-pressed={!customMode && questionCount === count}
                    className={`option-button ${!customMode && questionCount === count ? "is-selected" : ""}`}
                    onClick={() => {
                      setQuestionCount(count);
                      setCustomMode(false);
                      setPreparedQuestions(null);
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
                    setCustomDraft(String(questionCount));
                    setPreparedQuestions(null);
                  }}
                  type="button"
                >
                  Custom
                </button>
              </div>
              {customMode && (
                <label className="custom-field">
                  <span>Custom total</span>
                  <input
                    autoFocus
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="100"
                    value={customDraft}
                    onChange={(event) => {
                      setCustomDraft(event.target.value);
                      setCustomError("");
                      setPreparedQuestions(null);
                    }}
                  />
                  <small>{customError || "Choose from 1 to 100."}</small>
                </label>
              )}
            </fieldset>
          </div>

          <div className="setup-actions">
            <button className="button button--secondary" onClick={prepareQuestions}>
              {setupSummary}
            </button>
            <button className="button button--primary" onClick={startGame}>
              Start Quiz
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === "complete") {
    return (
      <main className="app-shell completion-screen">
        <section className="completion-card">
          <span className="completion-icon">✓</span>
          <span className="eyebrow">KJV Bible Quiz</span>
          <h1>Quiz Complete</h1>
          <p>
            {questions.length} {questions.length === 1 ? "question" : "questions"}{" "}
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
    <main className="play-shell">
      <GameHeader
        gameName="KJV Bible Quiz"
        progress={`Question ${index + 1} of ${questions.length}`}
        timeLeft={timeLeft}
        expired={expired}
        sound={sound}
        onToggleSound={() => setSound((value) => !value)}
        onExit={onExit}
      />

      <section className="quiz-board">
        <div className="question-row">
          <span className="question-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h1>{current.question}</h1>
        </div>

        <div className="choice-grid">
          {current.choices.map((choice, choiceIndex) => {
            const isCorrect = roundResolved && choiceIndex === current.correctIndex;
            const isWrong = wrongIndex === choiceIndex;
            return (
              <button
                key={`${choiceIndex}-${choice}`}
                className={[
                  "choice-button",
                  isCorrect ? "is-correct" : "",
                  isWrong ? "is-wrong" : "",
                  roundResolved && !isCorrect ? "is-muted" : "",
                ].join(" ")}
                disabled={roundResolved || expired || wrongIndex !== null}
                aria-pressed={isCorrect || isWrong}
                onClick={() => selectAnswer(choiceIndex)}
              >
                <span>{letters[choiceIndex]}</span>
                <strong>{choice}</strong>
              </button>
            );
          })}
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
              <strong>
                Correct! {letters[current.correctIndex]} — {current.answer}
              </strong>
              <span>{current.reference}</span>
            </>
          )}
          {feedback === "revealed" && (
            <>
              <strong>
                Answer: {letters[current.correctIndex]} — {current.answer}
              </strong>
              <span>{current.reference}</span>
            </>
          )}
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
          <button className="button button--secondary" onClick={resetQuestion}>
            Reset Timer
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
          {index === questions.length - 1 ? "Finish" : "Next →"}
        </button>
      </nav>
    </main>
  );
}
