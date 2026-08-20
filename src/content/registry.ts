import { fourPicsPuzzles } from "../data/fourPicsPuzzles";
import { quizQuestions } from "../data/quizQuestions";
import { verseBuilderStarterPack } from "../data/verseBuilderStarterPack";
import { normalizeAnswer } from "../utils";
import {
  CONTENT_SCHEMA_VERSION,
  type BibleContentRecord,
  type FourPicsContentRecord,
  type QuizContentRecord,
  type VerseBuilderContentRecord,
} from "./types";

const legacyValidation = { status: "legacy-imported" as const };

export const quizContentRecords: readonly QuizContentRecord[] = quizQuestions.map(
  (question, index) => ({
    ...question,
    id: `quiz-${String(index + 1).padStart(3, "0")}`,
    schemaVersion: CONTENT_SCHEMA_VERSION,
    referenceText: question.reference,
    themeIds: [],
    contentPackIds: ["kjventure-core"],
    validation: legacyValidation,
  }),
);

export const fourPicsContentRecords: readonly FourPicsContentRecord[] =
  fourPicsPuzzles.map((puzzle) => ({
    ...puzzle,
    id: `four-pics-${normalizeAnswer(puzzle.answer).toLowerCase()}`,
    schemaVersion: CONTENT_SCHEMA_VERSION,
    referenceText: puzzle.reference,
    themeIds: [],
    contentPackIds: ["kjventure-core"],
    validation: legacyValidation,
  }));

export const verseBuilderContentRecords: readonly VerseBuilderContentRecord[] =
  verseBuilderStarterPack;

export const allContentRecords: readonly BibleContentRecord[] = [
  ...quizContentRecords,
  ...fourPicsContentRecords,
  ...verseBuilderContentRecords,
];

const byId = new Map(allContentRecords.map((record) => [record.id, record]));

export function getContentRecord(id: string) {
  return byId.get(id);
}

export function getQuizRecord(id: string) {
  return quizContentRecords.find((record) => record.id === id);
}

export function getFourPicsRecord(id: string) {
  return fourPicsContentRecords.find((record) => record.id === id);
}

export function getVerseBuilderRecord(id: string) {
  return verseBuilderContentRecords.find((record) => record.id === id);
}

export function contentRecordExists(id: string) {
  return byId.has(id);
}
