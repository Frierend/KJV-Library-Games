import {
  fourPicsContentRecords,
  quizContentRecords,
  verseBuilderContentRecords,
} from "../content/registry";
import type { GameId, RegisteredGame } from "./types";

export const gameRegistry: Record<GameId, RegisteredGame> = {
  quiz: {
    id: "quiz",
    title: "KJV Bible Quiz",
    shortDescription: "Host-led Bible trivia with four choices and KJV references.",
    capabilities: {
      difficulty: false,
      timer: true,
      references: true,
      explanations: false,
    },
    contentCount: quizContentRecords.length,
    preload: () => import("./quiz/QuizGame"),
    loadComponent: () => import("./quiz/QuizGame"),
  },
  "four-pics": {
    id: "four-pics",
    title: "4 Pics 1 Word",
    shortDescription: "Connect four visual clues to a Bible word.",
    capabilities: {
      difficulty: false,
      timer: true,
      references: true,
      explanations: true,
    },
    contentCount: fourPicsContentRecords.length,
    preload: () => import("./four-pics/FourPicsGame"),
    loadComponent: () => import("./four-pics/FourPicsGame"),
  },
  "verse-builder": {
    id: "verse-builder",
    title: "Verse Builder",
    shortDescription: "Put curated KJV verse segments in the correct order.",
    capabilities: {
      difficulty: true,
      timer: true,
      references: true,
      explanations: false,
    },
    contentCount: verseBuilderContentRecords.length,
    preload: () => import("./verse-builder/VerseBuilderGame"),
    loadComponent: () => import("./verse-builder/VerseBuilderGame"),
  },
};

export const registeredGames = Object.values(gameRegistry);
