import type { VerseBuilderDifficulty } from "../../content/types";

export type VerseBuilderPlayStyle = "missing-words" | "verse-order";
export type MissingWordsDifficulty = "introductory" | "intermediate" | "advanced";
export type VerseOrderDifficulty = "all" | VerseBuilderDifficulty;

export interface VerseBuilderSettings {
  playStyle: VerseBuilderPlayStyle;
  missingWordsDifficulty: MissingWordsDifficulty;
  verseOrderDifficulty: VerseOrderDifficulty;
}

export const DEFAULT_VERSE_BUILDER_SETTINGS: VerseBuilderSettings = {
  playStyle: "missing-words",
  missingWordsDifficulty: "introductory",
  verseOrderDifficulty: "all",
};

export const LEGACY_VERSE_BUILDER_SETTINGS: VerseBuilderSettings = {
  playStyle: "verse-order",
  missingWordsDifficulty: "introductory",
  verseOrderDifficulty: "all",
};

const playStyles = ["missing-words", "verse-order"] as const;
const missingWordsDifficulties = ["introductory", "intermediate", "advanced"] as const;
const verseOrderDifficulties = ["all", ...missingWordsDifficulties] as const;

export function blankCountForDifficulty(difficulty: MissingWordsDifficulty): 1 | 2 | 3 {
  if (difficulty === "introductory") return 1;
  if (difficulty === "intermediate") return 2;
  return 3;
}

export function resolveVerseBuilderSettings(value: unknown): VerseBuilderSettings {
  if (value === undefined) return { ...LEGACY_VERSE_BUILDER_SETTINGS };
  if (!value || typeof value !== "object") {
    throw new Error("Invalid Verse Builder settings.");
  }

  const candidate = value as Partial<VerseBuilderSettings>;
  if (!playStyles.includes(candidate.playStyle as VerseBuilderPlayStyle)) {
    throw new Error("Invalid Verse Builder play style.");
  }
  if (!missingWordsDifficulties.includes(candidate.missingWordsDifficulty as MissingWordsDifficulty)) {
    throw new Error("Invalid Missing Words difficulty.");
  }
  if (!verseOrderDifficulties.includes(candidate.verseOrderDifficulty as VerseOrderDifficulty)) {
    throw new Error("Invalid Verse Order difficulty.");
  }

  return {
    playStyle: candidate.playStyle as VerseBuilderPlayStyle,
    missingWordsDifficulty: candidate.missingWordsDifficulty as MissingWordsDifficulty,
    verseOrderDifficulty: candidate.verseOrderDifficulty as VerseOrderDifficulty,
  };
}
