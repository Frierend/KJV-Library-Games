import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

interface GameCardProps {
  title: string;
  description: string;
  badge: string;
  accent: "blue" | "teal";
  preview: ReactNode;
  onPlay: () => void;
}

export function GameCard({
  title,
  description,
  badge,
  accent,
  preview,
  onPlay,
}: GameCardProps) {
  return (
    <article className={`game-card game-card--${accent}`}>
      <div className="game-card__preview" aria-hidden="true">
        {preview}
      </div>
      <div className="game-card__body">
        <span className="eyebrow">{badge}</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <button className="button button--primary" onClick={onPlay}>
          Open Game <ArrowRight aria-hidden="true" size={18} />
        </button>
      </div>
    </article>
  );
}
