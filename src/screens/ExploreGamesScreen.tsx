import { useNavigate } from "react-router-dom";
import { AppShell } from "../app/AppShell";
import { GameCard } from "../components/GameCard";

export function ExploreGamesScreen() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <section className="screen-heading">
        <span className="eyebrow">KJVenture Library</span>
        <h1>Explore Games</h1>
        <p>Quick Play keeps each game’s familiar setup and host-led flow.</p>
      </section>
      <section className="game-grid product-game-grid" aria-label="Available Bible games">
        <GameCard
          accent="blue"
          badge="100 questions"
          description="Host-led KJV trivia with mixed rounds, choices, and references."
          onPlay={() => navigate("/games/quiz")}
          preview={<div className="quiz-preview">{["A", "B", "C", "D"].map((letter) => <span key={letter}>{letter}</span>)}</div>}
          title="KJV Bible Quiz"
        />
        <GameCard
          accent="teal"
          badge="30 puzzles"
          description="Connect four visual clues, build the Bible word, and reveal its reference."
          onPlay={() => navigate("/games/four-pics")}
          preview={<div className="pics-preview"><span>🌧️</span><span>🛶</span><span>🦁</span><span>🌈</span></div>}
          title="4 Pics 1 Word"
        />
      </section>
    </AppShell>
  );
}
