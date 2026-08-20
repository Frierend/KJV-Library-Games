import { describe, expect, it } from "vitest";
import {
  isValidKjvCitation,
  KJV_BOOK_CHAPTERS,
  validateVerseBuilderRecords,
} from "./validators";
import { deriveVerseBuilderDifficulty, verseBuilderWordCount } from "./verseBuilder";
import { verseBuilderStarterPack } from "../data/verseBuilderStarterPack";

const APPROVED_SOURCE = "eng-kjv_vpl.zip";
const APPROVED_HASH = "0E2C5C10C808BAFB2A9F55B95A1A0908FB28E71DD67661B367D0F26B7551C39A";

describe("Verse Builder starter pack", () => {
  it("contains exactly 20 source-verified records in the approved 66-book canon", () => {
    expect(verseBuilderStarterPack).toHaveLength(20);
    expect(validateVerseBuilderRecords(verseBuilderStarterPack)).toEqual([]);
    expect(new Set(verseBuilderStarterPack.map((record) => record.id)).size).toBe(20);
    expect(new Set(verseBuilderStarterPack.map((record) => record.canonicalText)).size).toBe(20);
    expect(verseBuilderStarterPack.every((record) => isValidKjvCitation(record.reference))).toBe(true);
    expect(verseBuilderStarterPack.every((record) =>
      record.citations?.every((citation) =>
        Object.prototype.hasOwnProperty.call(KJV_BOOK_CHAPTERS, citation.book),
      ),
    )).toBe(true);
    expect(verseBuilderStarterPack.every((record) => record.validation.status === "reviewed")).toBe(true);
    expect(verseBuilderStarterPack.every((record) => record.validation.reviewer === "Frierend")).toBe(true);
    expect(verseBuilderStarterPack.every((record) => record.validation.reviewedAt === "2026-08-13")).toBe(true);
    expect(verseBuilderStarterPack.every((record) => record.validation.sourceNote?.includes(APPROVED_SOURCE))).toBe(true);
    expect(verseBuilderStarterPack.every((record) => record.validation.sourceNote?.includes(APPROVED_HASH))).toBe(true);
  });

  it("stores the deterministic difficulty and stays within approved v1 size limits", () => {
    const difficultyCounts = verseBuilderStarterPack.reduce<Record<string, number>>(
      (counts, record) => ({ ...counts, [record.difficulty]: (counts[record.difficulty] ?? 0) + 1 }),
      {},
    );

    expect(difficultyCounts).toEqual({ introductory: 9, intermediate: 8, advanced: 3 });
    expect(verseBuilderStarterPack.every((record) =>
      record.difficulty === deriveVerseBuilderDifficulty(record.canonicalText, record.segments),
    )).toBe(true);
    expect(Math.min(...verseBuilderStarterPack.map((record) => verseBuilderWordCount(record.canonicalText)))).toBeGreaterThanOrEqual(6);
    expect(Math.max(...verseBuilderStarterPack.map((record) => verseBuilderWordCount(record.canonicalText)))).toBeLessThanOrEqual(36);
    expect(Math.min(...verseBuilderStarterPack.map((record) => record.segments.length))).toBeGreaterThanOrEqual(3);
    expect(Math.max(...verseBuilderStarterPack.map((record) => record.segments.length))).toBeLessThanOrEqual(12);
  });

  it("matches the approved human segmentation corrections without duplicate visible chunks", () => {
    const segmentsFor = (reference: string) =>
      verseBuilderStarterPack.find((record) => record.reference === reference)?.segments.map(
        (segment) => segment.text,
      );

    expect(segmentsFor("Joshua 1:9")).toEqual([
      "Have not I commanded thee?",
      "Be strong and of a good courage;",
      "be not afraid,",
      "neither be thou dismayed:",
      "for the LORD thy God",
      "is with thee",
      "whithersoever thou goest.",
    ]);
    expect(segmentsFor("Matthew 6:33")).toEqual([
      "But seek ye first",
      "the kingdom of God,",
      "and his righteousness;",
      "and all these things",
      "shall be added unto you.",
    ]);
    expect(segmentsFor("Matthew 7:12")).toEqual([
      "Therefore all things",
      "whatsoever ye would",
      "that men should do to you,",
      "do ye even so to them:",
      "for this is the law",
      "and the prophets.",
    ]);
    expect(segmentsFor("Romans 8:28")).toEqual([
      "And we know",
      "that all things",
      "work together for good",
      "to them that love God,",
      "to them who are the called",
      "according to his purpose.",
    ]);
    expect(segmentsFor("Hebrews 11:1")).toEqual([
      "Now faith is",
      "the substance",
      "of things hoped for,",
      "the evidence",
      "of things not seen.",
    ]);
    expect(segmentsFor("John 13:34")).toEqual([
      "A new commandment I give unto you,",
      "That ye love one another;",
      "as I have loved you,",
      "that ye also love one another.",
    ]);
    expect(segmentsFor("1 John 4:7")).toEqual([
      "Beloved,",
      "let us love one another:",
      "for love is of God;",
      "and every one that loveth",
      "is born of God,",
      "and knoweth God.",
    ]);
    expect(segmentsFor("Psalm 23:2")).toEqual([
      "He maketh me to lie down",
      "in green pastures:",
      "he leadeth me beside",
      "the still waters.",
    ]);
    expect(verseBuilderStarterPack.some((record) => record.reference === "Psalm 23:1")).toBe(false);

    const normalizeVisibleText = (text: string) =>
      text.toLocaleLowerCase("en").replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/gu, " ").trim();
    expect(verseBuilderStarterPack.every((record) => {
      const normalizedSegments = record.segments.map((segment) => normalizeVisibleText(segment.text));
      return new Set(normalizedSegments).size === normalizedSegments.length;
    })).toBe(true);
  });
});
