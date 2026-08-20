import { describe, expect, it } from "vitest";
import { verseBuilderContentRecords } from "../../../content/registry";
import {
  isProtectedCaseToken,
  evaluateMissingWordsSubmission,
  matchesMissingWord,
  normalizeMissingWordAnswer,
  reconstructVerse,
  selectMissingWordTokenIndices,
  tokenizeVerse,
  type VerseToken,
} from "./missingWordsEngine";

function wordOrdinal(tokens: readonly VerseToken[], tokenIndex: number) {
  if (tokens[tokenIndex]?.kind !== "word") throw new Error(`Token ${tokenIndex} is not a word token`);
  return tokens.slice(0, tokenIndex).filter((token) => token.kind === "word").length;
}

function wordTokenIndex(tokens: readonly VerseToken[], word: string, occurrence = 0) {
  const matches = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.kind === "word" && token.word === word);
  const match = matches[occurrence];
  if (!match) throw new Error(`Missing word-token fixture: ${word} occurrence ${occurrence}`);
  return match.index;
}

describe("Missing Words verse tokens", () => {
  it("reconstructs punctuation and whitespace exactly", () => {
    // Synthetic tokenizer fixture; exact KJV provenance is irrelevant.
    const text = "Have not I commanded thee?  Be strong, and of a good courage;";
    const tokens = tokenizeVerse(text);

    expect(reconstructVerse(tokens)).toBe(text);
    expect(tokens.some((token) => token.kind === "separator" && token.text === "  ")).toBe(true);
    const strong = tokens.find((token): token is Extract<VerseToken, { kind: "word" }> => token.kind === "word" && token.word === "strong");
    expect(strong?.trailingPunctuation).toBe(",");
  });

  it("reconstructs every frozen reviewed verse byte-for-byte", () => {
    for (const record of verseBuilderContentRecords) {
      expect(reconstructVerse(tokenizeVerse(record.canonicalText))).toBe(record.canonicalText);
    }
  });

  it("excludes filler words and punctuation-only tokens", () => {
    // Synthetic engine fixture: exactly three meaningful candidates.
    const tokens = tokenizeVerse("For God -- the LORD; and mercy.");
    const indices = selectMissingWordTokenIndices(tokens, "fixture", "advanced");
    expect(indices.every((index) => tokens[index]?.kind === "word")).toBe(true);
    const words = indices.map((index) => tokens[index].kind === "word" ? tokens[index].word.toLowerCase() : "separator");
    expect(words).toEqual(["god", "lord", "mercy"]);
  });

  it("is deterministic and changes count with difficulty", () => {
    // Synthetic engine fixture: deterministic selection/count behavior only.
    const tokens = tokenizeVerse("For God so loved the world, that he gave his only begotten Son.");
    expect(selectMissingWordTokenIndices(tokens, "john-3-16", "intermediate")).toEqual(
      selectMissingWordTokenIndices(tokens, "john-3-16", "intermediate"),
    );
    expect(selectMissingWordTokenIndices(tokens, "john-3-16", "introductory")).not.toEqual(
      selectMissingWordTokenIndices(tokens, "john-3-16", "advanced"),
    );
  });

  it("avoids adjacent and duplicate normalized words when candidates permit", () => {
    // Synthetic engine fixture: repeated candidates and word-ordinal spacing.
    const tokens = tokenizeVerse("Love mercy and love truth, and walk humbly with God.");
    const selected = selectMissingWordTokenIndices(tokens, "micah", "advanced");
    const selectedWordOrdinals = selected.map((index) => wordOrdinal(tokens, index));
    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((index) => tokens[index].kind === "word" ? tokens[index].word.toLowerCase() : "")).size).toBe(3);
    expect(selectedWordOrdinals.some((ordinal, position) => position > 0 && ordinal - selectedWordOrdinals[position - 1] === 1)).toBe(false);
  });

  it("has three usable candidates in every frozen reviewed record", () => {
    for (const record of verseBuilderContentRecords) {
      expect(selectMissingWordTokenIndices(tokenizeVerse(record.canonicalText), record.id, "advanced"), record.reference).toHaveLength(3);
    }
  });

  it("ignores ordinary case, outer whitespace, and surrounding punctuation but not spelling", () => {
    // Synthetic matching fixture.
    const tokens = tokenizeVerse("In the beginning God created.");
    const index = wordTokenIndex(tokens, "beginning");
    expect(normalizeMissingWordAnswer("  BEGINNING, ")).toBe("BEGINNING");
    expect(matchesMissingWord(tokens, index, "  BEGINNING, ")).toBe(true);
    expect(matchesMissingWord(tokens, index, "begining")).toBe(false);
    expect(matchesMissingWord(tokens, index, "beginning earth")).toBe(false);
  });

  it.each([
    ["God", "God", true],
    ["God", "god", false],
    ["God", "GOD", false],
    ["LORD", "LORD", true],
    ["LORD", "Lord", false],
    ["Jesus", "jesus", false],
  ] as const)("applies strict sacred case for %s", (expected, draft, result) => {
    const tokens = tokenizeVerse(expected);
    expect(matchesMissingWord(tokens, wordTokenIndex(tokens, expected), draft)).toBe(result);
  });

  it("protects every token in approved sacred phrases", () => {
    // Synthetic matching fixture containing two approved phrases and one single token.
    const tokens = tokenizeVerse("Jesus Christ, Holy Spirit, and the Lord.");
    expect(tokens.flatMap((token, index) => token.kind === "word" && isProtectedCaseToken(tokens, index) ? [token.word] : [])).toEqual(["Jesus", "Christ", "Holy", "Spirit", "Lord"]);
    expect(matchesMissingWord(tokens, wordTokenIndex(tokens, "Jesus"), "jesus")).toBe(false);
    expect(matchesMissingWord(tokens, wordTokenIndex(tokens, "Christ"), "christ")).toBe(false);
    expect(matchesMissingWord(tokens, wordTokenIndex(tokens, "Spirit"), "spirit")).toBe(false);
  });

  it("does not count incomplete drafts", () => {
    // Synthetic submission fixture.
    const tokens = tokenizeVerse("In the beginning God created.");
    const blank = wordTokenIndex(tokens, "beginning");
    expect(evaluateMissingWordsSubmission(tokens, [blank], ["   "], 0, null)).toEqual({
      outcome: "incomplete",
      incorrectBlankIndexes: [],
      attemptCount: 0,
      firstSubmissionCorrect: null,
    });
  });

  it("preserves correct drafts and identifies only wrong blanks", () => {
    // Synthetic submission fixture.
    const tokens = tokenizeVerse("God created the earth.");
    const blanks = [wordTokenIndex(tokens, "God"), wordTokenIndex(tokens, "earth")];
    expect(evaluateMissingWordsSubmission(tokens, blanks, ["God", "wrong"], 0, null)).toMatchObject({
      outcome: "incorrect",
      incorrectBlankIndexes: [1],
      attemptCount: 1,
      firstSubmissionCorrect: false,
    });
  });

  it("retains first-submission eligibility across a retry", () => {
    // Synthetic submission fixture.
    const tokens = tokenizeVerse("God created the earth.");
    const blanks = [wordTokenIndex(tokens, "God"), wordTokenIndex(tokens, "earth")];
    expect(evaluateMissingWordsSubmission(tokens, blanks, ["God", "earth"], 0, null)).toMatchObject({
      outcome: "correct",
      attemptCount: 1,
      firstSubmissionCorrect: true,
    });
    expect(evaluateMissingWordsSubmission(tokens, blanks, ["God", "earth"], 1, false)).toMatchObject({
      outcome: "correct",
      attemptCount: 2,
      firstSubmissionCorrect: false,
    });
  });
});
