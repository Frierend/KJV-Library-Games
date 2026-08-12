import {
  ArrowLeft,
  ArrowRight,
  Eye,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { GameTopBar } from "../components/gameplay/GameTopBar";
import { HostControlDock } from "../components/gameplay/HostControlDock";
import { Scoreboard } from "../components/gameplay/Scoreboard";
import {
  ScoringSettingsDialog,
  type ScoringSettingsDraft,
} from "../components/gameplay/ScoringSettingsDialog";
import { StandingsDialog } from "../components/gameplay/StandingsDialog";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { getFourPicsRecord, getQuizRecord } from "../content/registry";
import {
  answerFromSlots,
  buildAnswerSlots,
  playerLetterCapacity,
} from "../games/four-pics/fourPicsLogic";
import { useSession } from "../session/controller";
import { canAdvance, currentPreparedRound, currentRoundState, playlistProgress } from "../session/selectors";
import type {
  FourPicsRoundState,
  PreparedFourPicsRound,
  PreparedQuizRound,
  QuizRoundState,
} from "../session/types";
import { isFullscreenFailure, normalizeAnswer, playTone } from "../utils";
import { gameRegistry } from "../games/registry";

function SessionCompletion() {
  const navigate = useNavigate();
  const { activeSession, discardSession } = useSession();
  if (!activeSession) return <Navigate replace to="/" />;
  return (
    <main className="app-shell completion-screen">
      <section className="completion-card">
        <span className="eyebrow">KJVenture</span>
        <h1>Final Results</h1>
        <p>{activeSession.preparedRounds.length} rounds completed.</p>
        <Scoreboard dispatch={() => undefined} readOnly session={activeSession} />
        <div className="setup-actions">
          <Button onClick={() => navigate("/studio")} variant="secondary">
            Host Another Session
          </Button>
          <Button
            onClick={() => {
              discardSession();
              navigate("/");
            }}
          >
            Return to Library
          </Button>
        </div>
      </section>
    </main>
  );
}

function QuizRound({
  round,
  state,
  onOpenStandings,
}: {
  round: PreparedQuizRound;
  state: QuizRoundState;
  onOpenStandings: () => void;
}) {
  const { activeSession, dispatch } = useSession();
  const record = getQuizRecord(round.contentId);
  if (!activeSession || !record) return null;
  const resolved = state.result === "correct" || state.result === "revealed";
  const disabled =
    resolved || state.result === "incorrect" || state.result === "expired";
  const showReference =
    activeSession.config.referenceDisplay === "always" ||
    (activeSession.config.referenceDisplay === "on-resolution" && resolved);

  return (
    <section className="quiz-board session-game-board" aria-labelledby="session-round-heading">
      {activeSession.config.showAudienceScores && (
        <Scoreboard
          audience
          dispatch={dispatch}
          onOpenStandings={onOpenStandings}
          readOnly
          session={activeSession}
        />
      )}
      <div className="question-row">
        <span className="question-number">
          {String(activeSession.roundIndex + 1).padStart(2, "0")}
        </span>
        <h1 id="session-round-heading" tabIndex={-1}>{record.question}</h1>
      </div>
      <div className="choice-grid">
        {record.choices.map((choice, index) => {
          const correct = resolved && index === record.correctIndex;
          const wrong = state.wrongIndex === index;
          return (
            <button
              aria-pressed={correct || wrong}
              className={[
                "choice-button",
                correct ? "is-correct" : "",
                wrong ? "is-wrong" : "",
                resolved && !correct ? "is-muted" : "",
              ].join(" ")}
              disabled={disabled}
              key={`${index}-${choice}`}
              onClick={() =>
                dispatch({
                  type: "QUIZ_SELECT",
                  choiceIndex: index,
                  correct: index === record.correctIndex,
                })
              }
            >
              <span>{String.fromCharCode(65 + index)}</span>
              <strong>{choice}</strong>
            </button>
          );
        })}
      </div>
      <div
        aria-live="polite"
        className={[
          "feedback",
          state.result === "incorrect" ? "feedback--wrong" : "",
          state.result === "expired" ? "feedback--expired" : "",
          state.result === "correct" ? "feedback--correct" : "",
          state.result === "revealed" ? "feedback--revealed" : "",
          state.result === "unchecked" && !showReference ? "feedback--empty" : "",
        ].join(" ")}
      >
        {state.result === "incorrect" && <strong>Wrong answer. Try again.</strong>}
        {state.result === "expired" && (
          <strong>
            {round.expiryBehavior === "allow-skip"
              ? "Time’s up! You may skip or reveal the answer."
              : "Time’s up! Reveal the answer to continue."}
          </strong>
        )}
        {state.result === "correct" && <strong>Correct! {record.answer}</strong>}
        {state.result === "revealed" && <strong>Answer: {record.answer}</strong>}
        {showReference && <span>{record.referenceText}</span>}
      </div>
    </section>
  );
}

function PictureGrid({ round }: { round: PreparedFourPicsRound }) {
  const record = getFourPicsRecord(round.contentId);
  if (!record) return null;
  return (
    <div className="picture-grid" aria-label="Four picture clues">
      {record.clues.map((clue) => (
        <figure
          aria-label={clue.label}
          className={`picture-clue picture-clue--${clue.tone}`}
          key={clue.label}
          role="img"
        >
          {clue.scene ? (
            <span aria-hidden="true" className={`clue-scene clue-scene--${clue.scene}`}>
              <i />
              <i />
              <i />
            </span>
          ) : (
            <span aria-hidden="true" className="clue-emoji">{clue.emoji}</span>
          )}
        </figure>
      ))}
    </div>
  );
}

function FourPicsRound({
  round,
  state,
  onOpenStandings,
}: {
  round: PreparedFourPicsRound;
  state: FourPicsRoundState;
  onOpenStandings: () => void;
}) {
  const { activeSession, dispatch } = useSession();
  const record = getFourPicsRecord(round.contentId);
  if (!activeSession || !record) return null;
  const answer = normalizeAnswer(record.answer);
  const tiles = state.selectedIds
    .map((id) => round.letterTiles.find((tile) => tile.id === id))
    .filter((tile) => tile !== undefined);
  const answerSlots = buildAnswerSlots(
    answer,
    round.hintPositions,
    tiles.map((tile) => tile.character),
    state.result === "revealed",
  );
  const enteredAnswer = answerFromSlots(answerSlots);
  const accepted = [record.answer, ...(record.acceptedAnswers ?? [])].map(normalizeAnswer);
  const resolved = state.result === "correct" || state.result === "revealed";
  const blocked =
    resolved ||
    state.result === "incorrect" ||
    state.result === "checking" ||
    state.result === "expired";
  const showReference =
    activeSession.config.referenceDisplay === "always" ||
    (activeSession.config.referenceDisplay === "on-resolution" && resolved);

  return (
    <section
      className={`four-pics-board session-game-board ${
        activeSession.config.showAudienceScores ? "four-pics-board--with-audience-scores" : ""
      }`}
      aria-labelledby="session-round-heading"
    >
      <PictureGrid round={round} />
      {activeSession.config.showAudienceScores && (
        <Scoreboard
          audience
          dispatch={dispatch}
          onOpenStandings={onOpenStandings}
          readOnly
          session={activeSession}
        />
      )}
      <div className="word-panel">
        <span className="eyebrow">Find the Bible word</span>
        <h1 className="sr-only" id="session-round-heading" tabIndex={-1}>Four Pics Bible word</h1>
        <div className="word-slots" aria-label={`${answer.length} letter answer`}>
          {answerSlots.map((slot, index) => (
            <span
              aria-label={
                slot.kind === "hint"
                  ? `Letter ${index + 1}: ${slot.character}, prefilled clue, locked`
                  : slot.character
                    ? `Letter ${index + 1}: ${slot.character}`
                    : `Letter ${index + 1}: empty`
              }
              className={`word-slot word-slot--${slot.kind} ${state.result === "correct" ? "is-correct" : ""}`}
              key={index}
            >
              {slot.character}
            </span>
          ))}
        </div>
        <div className="letter-bank" aria-label="Available letters">
          {round.letterTiles.map((tile) => {
            const selected = state.selectedIds.includes(tile.id);
            return (
              <button
                aria-label={`Letter ${tile.character}${selected ? ", selected" : ""}`}
                aria-pressed={selected}
                className={selected ? "is-selected" : ""}
                disabled={selected || blocked}
                key={tile.id}
                onClick={() =>
                  dispatch({
                    type: "FOUR_ADD_LETTER",
                    tileId: tile.id,
                    capacity: playerLetterCapacity(answer, round.hintPositions),
                  })
                }
              >
                {tile.character}
              </button>
            );
          })}
        </div>
        <div className="word-actions">
          <Button
            disabled={state.selectedIds.length === 0 || blocked}
            leadingIcon={<Trash2 size={18} />}
            onClick={() => dispatch({ type: "FOUR_DELETE_LETTER" })}
            variant="ghost"
          >
            Delete Last Letter
          </Button>
          <Button
            disabled={state.selectedIds.length === 0 || blocked}
            onClick={() =>
              dispatch({ type: "FOUR_SUBMIT", correct: accepted.includes(enteredAnswer) })
            }
          >
            Check Answer
          </Button>
        </div>
        <div
          aria-live="polite"
          className={[
            "feedback",
            state.result === "incorrect" ? "feedback--wrong" : "",
            state.result === "expired" ? "feedback--expired" : "",
            state.result === "correct" ? "feedback--correct" : "",
            state.result === "revealed" ? "feedback--revealed" : "",
            state.result === "unchecked" && !showReference ? "feedback--empty" : "",
          ].join(" ")}
        >
          {state.result === "incorrect" && <strong>Try again.</strong>}
          {state.result === "expired" && (
            <strong>
              {round.expiryBehavior === "allow-skip"
                ? "Time’s up! You may skip or reveal the answer."
                : "Time’s up! Reveal the answer to continue."}
            </strong>
          )}
          {state.result === "correct" && <strong>Correct! {record.answer}</strong>}
          {state.result === "revealed" && <strong>Answer: {record.answer}</strong>}
          {showReference && (
            <span>
              {record.referenceText}
              {activeSession.config.mode === "study" && ` — ${record.explanation}`}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

export function PlaySessionScreen() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeSession, dispatch } = useSession();
  const routeState = location.state as { fullscreenFailure?: unknown } | null;
  const fullscreenFailure = isFullscreenFailure(routeState?.fullscreenFailure)
    ? routeState.fullscreenFailure
    : null;
  const [confirmExit, setConfirmExit] = useState(false);
  const [scoringOverlay, setScoringOverlay] = useState<"settings" | "standings" | "reset" | null>(null);
  const activeSessionRef = useRef(activeSession);
  const navigationLock = useRef(false);
  const lastSoundSecond = useRef<number | null>(null);
  const timerWasRunningBeforeLeave = useRef(false);
  const timerWasRunningBeforeScoringOverlay = useRef(false);
  activeSessionRef.current = activeSession;

  const round = activeSession ? currentPreparedRound(activeSession) : undefined;
  const roundState = activeSession ? currentRoundState(activeSession) : undefined;
  const advanceAllowed = Boolean(
    round && roundState && canAdvance(roundState, round.expiryBehavior),
  );
  const progress = activeSession ? playlistProgress(activeSession) : null;
  const secondsLeft = activeSession?.timer.enabled
    ? Math.ceil(activeSession.timer.remainingMs / 1_000)
    : null;

  const openScoringOverlay = useCallback((overlay: "settings" | "standings" | "reset") => {
    const session = activeSessionRef.current;
    timerWasRunningBeforeScoringOverlay.current = Boolean(
      session?.status === "active" &&
      session.timer.enabled &&
      session.timer.status === "running",
    );
    if (session?.timer.status === "running") {
      dispatch({ type: "PAUSE_TIMER_FOR_DIALOG" });
    }
    setScoringOverlay(overlay);
  }, [dispatch]);

  const closeScoringOverlay = useCallback(() => {
    setScoringOverlay(null);
    if (timerWasRunningBeforeScoringOverlay.current) {
      dispatch({ type: "RESUME_TIMER" });
    }
    timerWasRunningBeforeScoringOverlay.current = false;
  }, [dispatch]);

  const saveScoringSettings = useCallback((draft: ScoringSettingsDraft) => {
    dispatch({
      type: "CONFIGURE_SCORING",
      mode: draft.mode,
      players: draft.players,
      teams: draft.teams,
    });
    closeScoringOverlay();
  }, [closeScoringOverlay, dispatch]);

  useEffect(() => {
    navigationLock.current = false;
    const heading = document.getElementById("session-round-heading");
    heading?.focus();
  }, [activeSession?.roundIndex]);

  useEffect(() => {
    const nextRound = activeSession?.preparedRounds[(activeSession?.roundIndex ?? -1) + 1];
    if (nextRound && nextRound.gameId !== "verse-builder") {
      void gameRegistry[nextRound.gameId].preload();
    }
  }, [activeSession?.preparedRounds, activeSession?.roundIndex]);

  useEffect(() => {
    if (!roundState || roundState.result !== "incorrect") return;
    const timeout = window.setTimeout(() => dispatch({ type: "CLEAR_INCORRECT" }), 1_200);
    return () => window.clearTimeout(timeout);
  }, [dispatch, roundState?.result]);

  useEffect(() => {
    if (!activeSession?.config.soundEnabled || secondsLeft === null) return;
    if (secondsLeft > 0 && secondsLeft <= 3 && lastSoundSecond.current !== secondsLeft) {
      lastSoundSecond.current = secondsLeft;
      playTone(true, 760, 0.09);
    }
    if (secondsLeft === 0 && lastSoundSecond.current !== 0) {
      lastSoundSecond.current = 0;
      playTone(true, 350, 0.35);
    }
  }, [activeSession?.config.soundEnabled, secondsLeft]);

  const submitFourPics = useMemo(() => {
    if (!round || round.gameId !== "four-pics" || !roundState || roundState.gameId !== "four-pics") {
      return null;
    }
    const record = getFourPicsRecord(round.contentId);
    if (!record) return null;
    const answerSlots = buildAnswerSlots(
      record.answer,
      round.hintPositions,
      roundState.selectedIds
        .map((id) => round.letterTiles.find((tile) => tile.id === id)?.character)
        .filter((character): character is string => Boolean(character)),
    );
    const accepted = [record.answer, ...(record.acceptedAnswers ?? [])].map(normalizeAnswer);
    return () =>
      dispatch({
        type: "FOUR_SUBMIT",
        correct: accepted.includes(answerFromSlots(answerSlots)),
      });
  }, [dispatch, round, roundState]);

  useEffect(() => {
    if (
      confirmExit ||
      scoringOverlay !== null ||
      !activeSession ||
      !round ||
      !roundState ||
      activeSession.status === "complete"
    ) return;
    const handleKey = (event: KeyboardEvent) => {
      if (round.gameId === "quiz" && roundState.gameId === "quiz") {
        const choice = ["a", "b", "c", "d"].indexOf(event.key.toLowerCase());
        const record = getQuizRecord(round.contentId);
        if (choice >= 0 && record) {
          event.preventDefault();
          dispatch({ type: "QUIZ_SELECT", choiceIndex: choice, correct: choice === record.correctIndex });
        }
      } else if (round.gameId === "four-pics" && roundState.gameId === "four-pics") {
        if (/^[a-z]$/i.test(event.key) && roundState.result === "unchecked") {
          const tile = round.letterTiles.find(
            (candidate) =>
              candidate.character === event.key.toUpperCase() &&
              !roundState.selectedIds.includes(candidate.id),
          );
          const record = getFourPicsRecord(round.contentId);
          if (tile && record) {
            event.preventDefault();
            dispatch({
              type: "FOUR_ADD_LETTER",
              tileId: tile.id,
              capacity: playerLetterCapacity(record.answer, round.hintPositions),
            });
          }
        } else if (event.key === "Backspace") {
          event.preventDefault();
          dispatch({ type: "FOUR_DELETE_LETTER" });
        }
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        dispatch({ type: "REVEAL" });
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (advanceAllowed && !navigationLock.current) {
          navigationLock.current = true;
          dispatch({ type: "NEXT" });
        } else if (round.gameId === "four-pics") {
          submitFourPics?.();
        }
      } else if (event.key === "ArrowRight" && advanceAllowed && !navigationLock.current) {
        event.preventDefault();
        navigationLock.current = true;
        dispatch({ type: "NEXT" });
      } else if (event.key === "ArrowLeft" && activeSession.roundIndex > 0) {
        event.preventDefault();
        dispatch({ type: "PREVIOUS" });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeSession, advanceAllowed, confirmExit, dispatch, round, roundState, scoringOverlay, submitFourPics]);

  if (!activeSession) return <Navigate replace to="/" />;
  if (activeSession.id !== sessionId) return <Navigate replace to="/restore" />;
  if (activeSession.status === "complete") return <SessionCompletion />;
  if (!round || !roundState) return <Navigate replace to="/" />;

  const gameName = round.gameId === "quiz" ? "KJV Bible Quiz" : "4 Pics 1 Word";
  const handleNext = () => {
    if (!advanceAllowed || navigationLock.current) return;
    navigationLock.current = true;
    dispatch({ type: "NEXT" });
  };
  const handleOpenExit = () => {
    const session = activeSessionRef.current;
    timerWasRunningBeforeLeave.current = Boolean(
      session?.status === "active" &&
      session.timer.enabled &&
      session.timer.status === "running",
    );
    if (session?.timer.status === "running") {
      dispatch({ type: "PAUSE_TIMER_FOR_DIALOG" });
    }
    setConfirmExit(true);
  };
  const handleCancelExit = () => {
    setConfirmExit(false);
    if (timerWasRunningBeforeLeave.current) {
      dispatch({ type: "RESUME_TIMER" });
    }
    timerWasRunningBeforeLeave.current = false;
  };

  return (
    <main className={`play-shell play-shell--${round.gameId} session-player`}>
      <GameTopBar
        expired={activeSession.timer.status === "expired"}
        gameName={gameName}
        onExit={handleOpenExit}
        onToggleSound={() => dispatch({ type: "TOGGLE_SOUND" })}
        paused={activeSession.timer.status === "paused"}
        progress={`Round ${progress?.overall}`}
        sound={activeSession.config.soundEnabled}
        timeLeft={secondsLeft}
        fullscreenFailure={fullscreenFailure}
      />

      {round.gameId === "quiz" && roundState.gameId === "quiz" ? (
        <QuizRound
          onOpenStandings={() => openScoringOverlay("standings")}
          round={round}
          state={roundState}
        />
      ) : round.gameId === "four-pics" && roundState.gameId === "four-pics" ? (
        <FourPicsRound
          onOpenStandings={() => openScoringOverlay("standings")}
          round={round}
          state={roundState}
        />
      ) : null}

      <HostControlDock
        scoreControls={
          ((activeSession.config.mode === "team" && activeSession.config.teams.length > 0) ||
            (activeSession.config.mode === "individual" && activeSession.config.players.length > 0))
            ? (
              <Scoreboard
                dispatch={dispatch}
                onConfigure={() => openScoringOverlay("settings")}
                onResetScores={() => openScoringOverlay("reset")}
                session={activeSession}
              />
            )
            : undefined
        }
        start={
          <>
            <Button
              leadingIcon={<Settings2 size={17} />}
              onClick={() => {
                dispatch({ type: "PAUSE_TIMER" });
                navigate("/studio");
              }}
              variant="ghost"
            >
              Session Studio
            </Button>
            <Button
              disabled={activeSession.roundIndex === 0}
              leadingIcon={<ArrowLeft size={17} />}
              onClick={() => dispatch({ type: "PREVIOUS" })}
              variant="secondary"
            >
              Previous
            </Button>
          </>
        }
        center={
          <>
            {activeSession.timer.enabled && (
              <Button
                leadingIcon={
                  activeSession.timer.status === "running" ? <Pause size={17} /> : <Play size={17} />
                }
                onClick={() => dispatch({ type: "TOGGLE_TIMER" })}
                variant="secondary"
              >
                {activeSession.timer.status === "running" ? "Pause" : "Resume"}
              </Button>
            )}
            <Button
              leadingIcon={<RotateCcw size={17} />}
              onClick={() => dispatch({ type: "RESET_ROUND" })}
              variant="secondary"
            >
              Reset Round
            </Button>
            <Button
              disabled={roundState.result === "revealed"}
              leadingIcon={<Eye size={17} />}
              onClick={() => dispatch({ type: "REVEAL" })}
              variant="reveal"
            >
              Reveal Answer
            </Button>
          </>
        }
        end={
          <Button
            disabled={!advanceAllowed}
            onClick={handleNext}
            trailingIcon={<ArrowRight size={18} />}
          >
            {activeSession.roundIndex === activeSession.preparedRounds.length - 1
              ? "Finish"
              : "Next"}
          </Button>
        }
      />

      <ConfirmDialog
        confirmLabel="Return to Library"
        description="Your session will be saved and can be continued from the library."
        onCancel={handleCancelExit}
        onConfirm={() => {
          timerWasRunningBeforeLeave.current = false;
          dispatch({ type: "PAUSE_TIMER" });
          navigate("/");
        }}
        open={confirmExit}
        title="Leave this session?"
      />

      <ConfirmDialog
        confirmLabel="Reset All Scores"
        description={`This permanently clears every ${activeSession.config.mode === "individual" ? "player" : "team"} score in this session. Rounds and answers are not affected.`}
        destructive
        onCancel={closeScoringOverlay}
        onConfirm={() => {
          dispatch({ type: "RESET_SCORES" });
          closeScoringOverlay();
        }}
        open={scoringOverlay === "reset"}
        title="Reset All Scores?"
      />

      <ScoringSettingsDialog
        onCancel={closeScoringOverlay}
        onSave={saveScoringSettings}
        open={scoringOverlay === "settings"}
        session={activeSession}
      />

      <StandingsDialog
        onClose={closeScoringOverlay}
        open={scoringOverlay === "standings"}
        session={activeSession}
      />
    </main>
  );
}
