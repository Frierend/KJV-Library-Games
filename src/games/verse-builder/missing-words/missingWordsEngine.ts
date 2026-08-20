import {
  blankCountForDifficulty,
  type MissingWordsDifficulty,
} from "../verseBuilderTypes";

export type { MissingWordsDifficulty } from "../verseBuilderTypes";
export { blankCountForDifficulty } from "../verseBuilderTypes";

export interface MissingWordsSubmission {
  outcome: "incomplete" | "incorrect" | "correct";
  incorrectBlankIndexes: number[];
  attemptCount: number;
  firstSubmissionCorrect: boolean | null;
}

export interface VerseWordToken {
  kind: "word";
  index: number;
  leadingPunctuation: string;
  word: string;
  trailingPunctuation: string;
  raw: string;
}

export interface VerseSeparatorToken {
  kind: "separator";
  index: number;
  text: string;
}

export type VerseToken = VerseWordToken | VerseSeparatorToken;

const WORD_PATTERN = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;

export const MISSING_WORD_STOP_WORDS: ReadonlySet<string> = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for",
  "from", "he", "him", "his", "i", "in", "is", "it", "me", "my",
  "neither", "of", "on", "or", "that", "the", "thee", "them", "they",
  "this", "thou", "thy", "to", "unto", "us", "we", "what", "which",
  "who", "with", "ye", "you", "your",
]);

function trailingPunctuationAfter(text: string, wordEnd: number, nextWordStart: number) {
  const betweenWords = text.slice(wordEnd, nextWordStart);
  const whitespaceIndex = betweenWords.search(/\s/);
  if (whitespaceIndex < 0) return betweenWords;
  if (whitespaceIndex === 0) return "";
  return betweenWords.slice(0, whitespaceIndex);
}

function leadingPunctuationBefore(text: string) {
  const whitespaceIndex = text.search(/\s(?=[^\s]*$)/);
  if (whitespaceIndex < 0) return { separator: "", punctuation: text };
  const punctuation = text.slice(whitespaceIndex + 1);
  return punctuation && !/\s/.test(punctuation)
    ? { separator: text.slice(0, whitespaceIndex + 1), punctuation }
    : { separator: text, punctuation: "" };
}

export function tokenizeVerse(canonicalText: string): VerseToken[] {
  const matches = [...canonicalText.matchAll(WORD_PATTERN)];
  const tokens: VerseToken[] = [];
  let cursor = 0;

  for (const [matchIndex, match] of matches.entries()) {
    const start = match.index ?? 0;
    const word = match[0];
    const before = canonicalText.slice(cursor, start);
    const leading = leadingPunctuationBefore(before);
    if (leading.separator) {
      tokens.push({ kind: "separator", index: tokens.length, text: leading.separator });
    }

    const nextStart = matches[matchIndex + 1]?.index ?? canonicalText.length;
    const trailingPunctuation = trailingPunctuationAfter(canonicalText, start + word.length, nextStart);
    const raw = `${leading.punctuation}${word}${trailingPunctuation}`;
    tokens.push({
      kind: "word",
      index: tokens.length,
      leadingPunctuation: leading.punctuation,
      word,
      trailingPunctuation,
      raw,
    });
    cursor = start + word.length + trailingPunctuation.length;
  }

  if (cursor < canonicalText.length) {
    tokens.push({ kind: "separator", index: tokens.length, text: canonicalText.slice(cursor) });
  }
  return tokens;
}

export function reconstructVerse(tokens: readonly VerseToken[]) {
  return tokens.map((token) => token.kind === "word" ? token.raw : token.text).join("");
}

function fnv1a(value: string) {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function wordOrdinal(tokens: readonly VerseToken[], tokenIndex: number) {
  return tokens.slice(0, tokenIndex).filter((token) => token.kind === "word").length;
}

interface MissingWordCandidate {
  tokenIndex: number;
  normalizedWord: string;
  wordOrdinal: number;
}

export function selectMissingWordTokenIndices(
  tokens: readonly VerseToken[],
  verseId: string,
  difficulty: MissingWordsDifficulty,
) {
  const count = blankCountForDifficulty(difficulty);
  const candidates: MissingWordCandidate[] = tokens.flatMap((token, tokenIndex) => {
    if (token.kind !== "word" || !/[A-Za-z]/.test(token.word)) return [];
    const normalizedWord = token.word.toLowerCase();
    return MISSING_WORD_STOP_WORDS.has(normalizedWord)
      ? []
      : [{ tokenIndex, normalizedWord, wordOrdinal: wordOrdinal(tokens, tokenIndex) }];
  });
  const occurrences = new Map<string, number>();
  for (const candidate of candidates) {
    occurrences.set(candidate.normalizedWord, (occurrences.get(candidate.normalizedWord) ?? 0) + 1);
  }
  const uniqueCandidates = candidates.filter((candidate) => occurrences.get(candidate.normalizedWord) === 1);
  if (uniqueCandidates.length + new Set(
    candidates
      .filter((candidate) => occurrences.get(candidate.normalizedWord)! > 1)
      .map((candidate) => candidate.normalizedWord),
  ).size < count) {
    throw new Error(`Verse ${verseId} does not have ${count} usable Missing Words candidates.`);
  }

  const totalWordCount = tokens.filter((token) => token.kind === "word").length;
  const anchors = Array.from({ length: count }, (_, index) =>
    ((Math.max(0, totalWordCount - 1)) * (index + 1)) / (count + 1),
  );
  const pool = uniqueCandidates.length >= count ? uniqueCandidates : candidates;
  const selected: MissingWordCandidate[] = [];

  for (const anchor of anchors) {
    const selectedWords = new Set(selected.map((candidate) => candidate.normalizedWord));
    const available = pool.filter((candidate) =>
      !selected.some((chosen) => chosen.tokenIndex === candidate.tokenIndex) &&
      (occurrences.get(candidate.normalizedWord) === 1 || !selectedWords.has(candidate.normalizedWord)),
    );
    const nonAdjacent = available.filter((candidate) =>
      selected.every((chosen) => Math.abs(chosen.wordOrdinal - candidate.wordOrdinal) !== 1),
    );
    const choices = nonAdjacent.length > 0 ? nonAdjacent : available;
    const chosen = [...choices].sort((first, second) => {
      const distance = Math.abs(first.wordOrdinal - anchor) - Math.abs(second.wordOrdinal - anchor);
      if (distance !== 0) return distance;
      const firstHash = fnv1a(`${verseId}:${difficulty}:${first.tokenIndex}`);
      const secondHash = fnv1a(`${verseId}:${difficulty}:${second.tokenIndex}`);
      return firstHash - secondHash || first.tokenIndex - second.tokenIndex;
    })[0];
    if (!chosen) {
      throw new Error(`Verse ${verseId} does not have enough spaced Missing Words candidates.`);
    }
    selected.push(chosen);
  }

  return selected.map((candidate) => candidate.tokenIndex).sort((first, second) => first - second);
}

const protectedSingleWords = new Set([
  "God", "LORD", "Lord", "Jesus", "Christ", "Father", "Son", "Saviour",
]);
const protectedPhrases = [
  ["Jesus", "Christ"],
  ["Lord", "Jesus"],
  ["Lord", "Jesus", "Christ"],
  ["Holy", "Ghost"],
  ["Holy", "Spirit"],
] as const;

function protectedTokenIndices(tokens: readonly VerseToken[]) {
  const protectedIndices = new Set<number>();
  const wordTokens = tokens
    .map((token, index) => ({ token, index }))
    .filter((entry): entry is { token: VerseWordToken; index: number } => entry.token.kind === "word");

  for (const { token, index } of wordTokens) {
    if (token.kind === "word" && protectedSingleWords.has(token.word)) {
      protectedIndices.add(index);
    }
  }
  for (const phrase of protectedPhrases) {
    for (let start = 0; start <= wordTokens.length - phrase.length; start += 1) {
      if (phrase.every((word, offset) => wordTokens[start + offset].token.kind === "word" && wordTokens[start + offset].token.word === word)) {
        for (let offset = 0; offset < phrase.length; offset += 1) {
          protectedIndices.add(wordTokens[start + offset].index);
        }
      }
    }
  }
  return protectedIndices;
}

export function isProtectedCaseToken(tokens: readonly VerseToken[], tokenIndex: number) {
  return protectedTokenIndices(tokens).has(tokenIndex);
}

export function normalizeMissingWordAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "");
}

export function matchesMissingWord(
  tokens: readonly VerseToken[],
  tokenIndex: number,
  draft: string,
) {
  const token = tokens[tokenIndex];
  if (!token || token.kind !== "word") return false;
  const answer = normalizeMissingWordAnswer(draft);
  const canonical = normalizeMissingWordAnswer(token.word);
  if (isProtectedCaseToken(tokens, tokenIndex)) return answer === canonical;
  return answer.toLocaleLowerCase("en-US") === canonical.toLocaleLowerCase("en-US");
}

export function evaluateMissingWordsSubmission(
  tokens: readonly VerseToken[],
  blankTokenIndices: readonly number[],
  drafts: readonly string[],
  attemptCount: number,
  firstSubmissionCorrect: boolean | null,
): MissingWordsSubmission {
  if (blankTokenIndices.some((_, blankIndex) => !(drafts[blankIndex] ?? "").trim())) {
    return {
      outcome: "incomplete",
      incorrectBlankIndexes: [],
      attemptCount,
      firstSubmissionCorrect,
    };
  }

  const incorrectBlankIndexes = blankTokenIndices.flatMap((tokenIndex, blankIndex) =>
    matchesMissingWord(tokens, tokenIndex, drafts[blankIndex] ?? "") ? [] : [blankIndex],
  );
  const correct = incorrectBlankIndexes.length === 0;
  return {
    outcome: correct ? "correct" : "incorrect",
    incorrectBlankIndexes,
    attemptCount: attemptCount + 1,
    firstSubmissionCorrect: firstSubmissionCorrect ?? correct,
  };
}
