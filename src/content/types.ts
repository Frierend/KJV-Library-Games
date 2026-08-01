import type { FourPicsPuzzle, QuizQuestion } from "../types/games";

export const CONTENT_SCHEMA_VERSION = 1;
export const CONTENT_VERSION = "kjventure-core-1";

export interface ScriptureCitation {
  book: string;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
}

export interface ContentValidation {
  status: "legacy-imported" | "reviewed";
  reviewer?: string;
  reviewedAt?: string;
  sourceNote?: string;
}

export interface BibleContentMetadata {
  id: string;
  schemaVersion: number;
  referenceText: string;
  citations?: readonly ScriptureCitation[];
  verseExcerpt?: string;
  context?: string;
  discussionQuestions?: readonly string[];
  difficulty?: "introductory" | "intermediate" | "advanced";
  themeIds: readonly string[];
  contentPackIds: readonly string[];
  validation: ContentValidation;
}

export type QuizContentRecord = QuizQuestion & BibleContentMetadata;
export type FourPicsContentRecord = FourPicsPuzzle & BibleContentMetadata;

export type BibleContentRecord = QuizContentRecord | FourPicsContentRecord;

export interface ContentPack {
  id: string;
  title: string;
  description: string;
  version: string;
  builtIn: boolean;
  recordIds: readonly string[];
}
