import { describe, expect, it } from "vitest";
import type { VerseBuilderContentRecord } from "./types";
import {
  deriveVerseBuilderDifficulty,
  verseBuilderDifficultyScore,
} from "./verseBuilder";
import {
  validateVerseBuilderRecord,
  validateVerseBuilderRecords,
} from "./validators";
import { CONTENT_SCHEMA_VERSION } from "./types";

function fixture(
  overrides: Partial<VerseBuilderContentRecord> = {},
): VerseBuilderContentRecord {
  const canonicalText = "Alpha begins, beta continues, gamma ends.";
  const segments = [
    { id: "first", text: "Alpha begins," },
    { id: "second", text: "beta continues," },
    { id: "third", text: "gamma ends." },
  ];
  return {
    id: "verse-builder-fixture-one",
    schemaVersion: CONTENT_SCHEMA_VERSION,
    reference: "Genesis 1:1",
    referenceText: "Genesis 1:1",
    canonicalText,
    segments,
    difficulty: deriveVerseBuilderDifficulty(canonicalText, segments),
    themeIds: [],
    contentPackIds: ["kjventure-core"],
    validation: {
      status: "legacy-imported",
      sourceNote: "Test-only fixture; not approved production content.",
    },
    ...overrides,
  };
}

describe("Verse Builder content contract", () => {
  it("reconstructs canonical text from trimmed ordered segments", () => {
    expect(validateVerseBuilderRecord(fixture())).toEqual([]);
  });

  it("derives deterministic difficulty from word count, segment count, and repetition", () => {
    const segments = [
      { id: "a", text: "and" },
      { id: "b", text: "and" },
      { id: "c", text: "peace." },
    ];
    expect(verseBuilderDifficultyScore("and and peace.", segments)).toBe(1);
    expect(deriveVerseBuilderDifficulty("and and peace.", segments)).toBe("introductory");
    expect(validateVerseBuilderRecord(fixture({ difficulty: "advanced" }))).toEqual([
      expect.objectContaining({ message: "Difficulty does not match the deterministic Verse Builder formula." }),
    ]);
  });

  it("allows repeated visible text when segment IDs remain distinct", () => {
    const record = fixture({
      canonicalText: "and and peace.",
      segments: [
        { id: "first-and", text: "and" },
        { id: "second-and", text: "and" },
        { id: "peace", text: "peace." },
      ],
      difficulty: "introductory",
    });

    expect(validateVerseBuilderRecord(record)).toEqual([]);
  });

  it("rejects malformed punctuation and whitespace reconstruction", () => {
    const record = fixture({
      canonicalText: "Alpha begins, beta continues, gamma ends.",
      segments: [
        { id: "first", text: "Alpha begins" },
        { id: "second", text: "beta continues," },
        { id: "third", text: "gamma ends." },
      ],
    });

    expect(validateVerseBuilderRecord(record).map(({ message }) => message)).toContain(
      "Normalized segments must reconstruct canonical verse text exactly.",
    );
  });

  it("rejects duplicate IDs, invalid citations, unsupported lengths, and missing source notes", () => {
    const record = fixture({
      id: "bad-id",
      reference: "Not a citation",
      referenceText: "Not a citation",
      segments: [
        { id: "same", text: "Alpha" },
        { id: "same", text: "beta" },
      ],
      validation: { status: "legacy-imported" },
    });
    const messages = validateVerseBuilderRecord(record).map(({ message }) => message);

    expect(messages).toContain("Verse Builder IDs must use the stable verse-builder-* format.");
    expect(messages).toContain("Reference must use a canonical KJV citation.");
    expect(messages).toContain("Verse Builder requires 3 to 12 segments.");
    expect(messages).toContain("Segment IDs must be unique.");
    expect(messages).toContain("Verse Builder source provenance is required.");
  });

  it("rejects duplicate canonical verses within a pack", () => {
    const first = fixture();
    const second = fixture({ id: "verse-builder-fixture-two" });

    expect(validateVerseBuilderRecords([first, second]).map(({ message }) => message)).toContain(
      "Duplicate Verse Builder canonical verse in content pack.",
    );
  });
});
