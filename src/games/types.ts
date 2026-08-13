import type { ComponentType } from "react";

export type GameId = "quiz" | "four-pics" | "verse-builder";

export interface GameCapabilities {
  difficulty: boolean;
  timer: boolean;
  references: boolean;
  explanations: boolean;
}

export interface RegisteredGame {
  id: GameId;
  title: string;
  shortDescription: string;
  capabilities: GameCapabilities;
  contentCount: number;
  preload: () => Promise<unknown>;
  loadComponent: () => Promise<{ default: ComponentType<{ onExit: () => void }> }>;
}
