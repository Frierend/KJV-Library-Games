import { describe, expect, it } from "vitest";
import { contentPacks } from "./contentPacks";
import {
  allContentRecords,
  fourPicsContentRecords,
  quizContentRecords,
  verseBuilderContentRecords,
  getContentRecord,
} from "./registry";
import { gameRegistry } from "../games/registry";
import { CONTENT_SCHEMA_VERSION } from "./types";
import type { QuizContentRecord } from "./types";
import {
  isValidKjvCitation,
  validateContentRecords,
} from "./validators";

function contentFingerprint(value: string) {
  let first = 2_166_136_261;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16_777_619);
    second = Math.imul(second ^ code, 2_246_822_519);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

describe("KJVenture content registry", () => {
  it("preserves the full legacy library with stable unique IDs", () => {
    expect(quizContentRecords).toHaveLength(100);
    expect(fourPicsContentRecords).toHaveLength(30);
    expect(verseBuilderContentRecords).toHaveLength(20);
    expect(allContentRecords).toHaveLength(150);
    expect(new Set(allContentRecords.map((record) => record.id))).toHaveLength(150);
    expect(getContentRecord(verseBuilderContentRecords[0].id)).toEqual(verseBuilderContentRecords[0]);
  });

  it("keeps visible references and marks migrated records", () => {
    for (const record of [...quizContentRecords, ...fourPicsContentRecords]) {
      expect(record.schemaVersion).toBe(CONTENT_SCHEMA_VERSION);
      expect(record.referenceText).toBe(record.reference);
      expect(record.validation.status).toBe("legacy-imported");
    }
    for (const record of verseBuilderContentRecords) {
      expect(record.schemaVersion).toBe(CONTENT_SCHEMA_VERSION);
      expect(record.referenceText).toBe(record.reference);
      expect(record.validation.status).toBe("reviewed");
    }
  });

  it("passes structural integrity validation", () => {
    expect(validateContentRecords(allContentRecords)).toEqual([]);
    expect(contentPacks[0].recordIds).toHaveLength(150);
  });

  it("registers Verse Builder as a timed, reference-aware game", () => {
    expect(gameRegistry["verse-builder"]).toMatchObject({
      id: "verse-builder",
      contentCount: 20,
      capabilities: {
        difficulty: true,
        timer: true,
        references: true,
        explanations: false,
      },
    });
    expect(gameRegistry["verse-builder"].loadComponent).toEqual(expect.any(Function));
  });

  it("accepts canonical KJV citation forms and rejects invalid books and ranges", () => {
    expect(isValidKjvCitation("Genesis 1:1")).toBe(true);
    expect(isValidKjvCitation("Exodus 7–12")).toBe(true);
    expect(isValidKjvCitation("Matthew 14:29; 26:74–75")).toBe(true);
    expect(isValidKjvCitation("Colossians 4:14; Luke 1:1–4")).toBe(true);

    expect(isValidKjvCitation("Psalm titles")).toBe(false);
    expect(isValidKjvCitation("Wisdom 1:1")).toBe(false);
    expect(isValidKjvCitation("Genesis 51:1")).toBe(false);
    expect(isValidKjvCitation("John 3:16–14")).toBe(false);
    expect(isValidKjvCitation("John 3:0")).toBe(false);
  });

  it("detects normalized contradictions, invalid choices, foreign labels, and invisible text", () => {
    const duplicate: QuizContentRecord = {
      ...quizContentRecords[1],
      id: "quiz-999",
      question: "WHAT is the first book of the Bible!!!",
      answer: "Exodus",
      choices: ["Exodus", "Exodus", "", "Genesis"],
      correctIndex: 0,
    };
    const malformed: QuizContentRecord = {
      ...quizContentRecords[2],
      id: "quiz-998",
      question: "Which answer uses the NIV?\u200B",
    };
    const messages = validateContentRecords([
      quizContentRecords[0],
      duplicate,
      malformed,
    ]).map(({ message }) => message);

    expect(messages).toContain(
      "Duplicate quiz prompt after punctuation and case normalization.",
    );
    expect(messages).toContain(
      "Contradictory duplicate quiz prompt has a different answer.",
    );
    expect(messages).toContain("Quiz choices must not be duplicated.");
    expect(messages).toContain("Quiz choices must be nonempty.");
    expect(messages).toContain(
      "Quiz answer must appear exactly once among the choices.",
    );
    expect(messages).toContain("Displayed content names a non-KJV Bible translation.");
    expect(messages).toContain(
      "Displayed content contains malformed Unicode or invisible whitespace.",
    );
  });

  it("locks every reviewed semantic field to its stable record ID", () => {
    const semanticRecords = [...quizContentRecords, ...fourPicsContentRecords].map((record) =>
      record.id.startsWith("quiz-")
        ? [
            record.id,
            (record as (typeof quizContentRecords)[number]).question,
            (record as (typeof quizContentRecords)[number]).choices,
            (record as (typeof quizContentRecords)[number]).correctIndex,
            (record as (typeof quizContentRecords)[number]).answer,
            record.referenceText,
          ]
        : [
            record.id,
            (record as (typeof fourPicsContentRecords)[number]).answer,
            (record as (typeof fourPicsContentRecords)[number]).acceptedAnswers ?? [],
            record.referenceText,
            (record as (typeof fourPicsContentRecords)[number]).explanation,
            (record as (typeof fourPicsContentRecords)[number]).extraLetters,
            (record as (typeof fourPicsContentRecords)[number]).clues,
          ],
    );
    const fingerprint = contentFingerprint(JSON.stringify(semanticRecords));

    expect(fingerprint).toBe("e6bac39de95d21b9");
  });
});
