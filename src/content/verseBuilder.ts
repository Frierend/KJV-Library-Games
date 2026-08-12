import type {
  VerseBuilderDifficulty,
  VerseBuilderSegment,
} from "./types";

export function normalizeVerseBuilderText(value: string) {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function normalizedSegmentText(value: string) {
  return normalizeVerseBuilderText(value)
    .toLocaleLowerCase("en")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function verseBuilderWordCount(canonicalText: string) {
  const normalized = normalizeVerseBuilderText(canonicalText);
  return normalized ? normalized.split(" ").length : 0;
}

export function verseBuilderDifficultyScore(
  canonicalText: string,
  segments: readonly VerseBuilderSegment[],
) {
  const wordCount = verseBuilderWordCount(canonicalText);
  const wordBand = wordCount <= 12 ? 0 : wordCount <= 20 ? 1 : 2;
  const segmentBand = segments.length <= 5 ? 0 : segments.length <= 8 ? 1 : 2;
  const normalizedSegments = segments.map((segment) => normalizedSegmentText(segment.text));
  const repeatedPenalty = new Set(normalizedSegments).size < normalizedSegments.length ? 1 : 0;
  return wordBand + segmentBand + repeatedPenalty;
}

export function deriveVerseBuilderDifficulty(
  canonicalText: string,
  segments: readonly VerseBuilderSegment[],
): VerseBuilderDifficulty {
  const score = verseBuilderDifficultyScore(canonicalText, segments);
  return score <= 1 ? "introductory" : score <= 3 ? "intermediate" : "advanced";
}
