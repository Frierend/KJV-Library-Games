import { lazy, Suspense, useState } from "react";
import { GameCard } from "./components/GameCard";
import type { AppScreen } from "./types/games";

const QuizGame = lazy(() => import("./games/quiz/QuizGame"));
const FourPicsGame = lazy(() => import("./games/four-pics/FourPicsGame"));

function Library({ onOpen }: { onOpen: (screen: AppScreen) => void }) {
  return (
    <main className="app-shell library">
      <header className="library__header">
        <div className="app-brand">
          <span className="brand-mark brand-mark--large">✦</span>
          <div>
            <span className="eyebrow">King James Version</span>
            <h1>KJV Bible Games</h1>
          </div>
        </div>
        <p>Choose a game for your fellowship, class, or Bible activity.</p>
      </header>

      <section className="game-grid" aria-label="Available Bible games">
        <GameCard
          title="KJV Bible Quiz"
          badge="Game 01"
          accent="blue"
          description="Host-led multiple-choice trivia with 100 KJV questions, mixed rounds, and an automatic countdown."
          onPlay={() => onOpen("quiz")}
          preview={
            <div className="quiz-preview">
              {["A", "B", "C", "D"].map((letter) => (
                <span key={letter}>{letter}</span>
              ))}
            </div>
          }
        />
        <GameCard
          title="4 Pics 1 Word"
          badge="Game 02"
          accent="purple"
          description="Connect four visual Bible clues, build the answer from shuffled letters, and reveal its KJV reference."
          onPlay={() => onOpen("four-pics")}
          preview={
            <div className="pics-preview">
              <span>🌧️</span>
              <span>🛶</span>
              <span>🦁</span>
              <span>🌈</span>
            </div>
          }
        />
      </section>

      <footer className="library__footer">
        <span>Host-led • No scoring • Responsive presentation mode</span>
      </footer>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("library");

  if (screen === "library") {
    return <Library onOpen={setScreen} />;
  }

  return (
    <Suspense
      fallback={
        <main className="app-shell loading-screen">
          <span className="brand-mark brand-mark--large">✦</span>
          <p>Preparing game…</p>
        </main>
      }
    >
      {screen === "quiz" ? (
        <QuizGame onExit={() => setScreen("library")} />
      ) : (
        <FourPicsGame onExit={() => setScreen("library")} />
      )}
    </Suspense>
  );
}
