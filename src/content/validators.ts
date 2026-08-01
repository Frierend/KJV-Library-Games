import { normalizeAnswer } from "../utils";
import type {
  BibleContentRecord,
  FourPicsContentRecord,
  QuizContentRecord,
} from "./types";
import { CONTENT_SCHEMA_VERSION } from "./types";

export interface ContentValidationIssue {
  recordId: string;
  message: string;
}

export function validateQuizRecord(record: QuizContentRecord) {
  const issues: ContentValidationIssue[] = [];
  if (record.choices.length !== 4) {
    issues.push({ recordId: record.id, message: "Quiz must have four choices." });
  }
  if (
    record.correctIndex < 0 ||
    record.correctIndex >= record.choices.length ||
    record.choices[record.correctIndex] !== record.answer
  ) {
    issues.push({
      recordId: record.id,
      message: "Quiz answer must match the indexed correct choice.",
    });
  }
  if (!record.question.trim() || !record.referenceText.trim()) {
    issues.push({ recordId: record.id, message: "Prompt and reference are required." });
  }
  return issues;
}

export function validateFourPicsRecord(record: FourPicsContentRecord) {
  const issues: ContentValidationIssue[] = [];
  if (!normalizeAnswer(record.answer) || record.clues.length !== 4) {
    issues.push({
      recordId: record.id,
      message: "Four Pics records need an answer and four clues.",
    });
  }
  if (!record.referenceText.trim() || !record.explanation.trim()) {
    issues.push({
      recordId: record.id,
      message: "Four Pics reference and explanation are required.",
    });
  }
  return issues;
}

export function validateContentRecords(records: readonly BibleContentRecord[]) {
  const issues: ContentValidationIssue[] = [];
  const ids = new Set<string>();
  const quizPrompts = new Set<string>();
  const fourPicsAnswers = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) {
      issues.push({ recordId: record.id, message: "Duplicate content ID." });
    }
    ids.add(record.id);
    if (record.schemaVersion !== CONTENT_SCHEMA_VERSION) {
      issues.push({ recordId: record.id, message: "Unsupported content schema version." });
    }
    if (!record.contentPackIds.includes("kjventure-core")) {
      issues.push({ recordId: record.id, message: "Record is missing core pack membership." });
    }
    if (
      record.referenceText !== record.referenceText.trim() ||
      /[\r\n\t]/.test(record.referenceText)
    ) {
      issues.push({ recordId: record.id, message: "Reference contains invalid whitespace." });
    }
    if (record.id.startsWith("quiz-")) {
      const prompt = (record as QuizContentRecord).question.trim().toLowerCase();
      if (quizPrompts.has(prompt)) {
        issues.push({ recordId: record.id, message: "Duplicate quiz prompt." });
      }
      quizPrompts.add(prompt);
      issues.push(...validateQuizRecord(record as QuizContentRecord));
    } else {
      const answer = normalizeAnswer((record as FourPicsContentRecord).answer);
      if (fourPicsAnswers.has(answer)) {
        issues.push({ recordId: record.id, message: "Duplicate Four Pics answer." });
      }
      fourPicsAnswers.add(answer);
      issues.push(...validateFourPicsRecord(record as FourPicsContentRecord));
    }
  }
  return issues;
}
