import { normalizeAnswer } from "../utils";
import type {
  BibleContentRecord,
  FourPicsContentRecord,
  QuizContentRecord,
  VerseBuilderContentRecord,
} from "./types";
import { CONTENT_SCHEMA_VERSION } from "./types";
import { deriveVerseBuilderDifficulty, normalizeVerseBuilderText } from "./verseBuilder";

export interface ContentValidationIssue {
  recordId: string;
  message: string;
}

export const KJV_BOOK_CHAPTERS = {
  Genesis: 50,
  Exodus: 40,
  Leviticus: 27,
  Numbers: 36,
  Deuteronomy: 34,
  Joshua: 24,
  Judges: 21,
  Ruth: 4,
  "1 Samuel": 31,
  "2 Samuel": 24,
  "1 Kings": 22,
  "2 Kings": 25,
  "1 Chronicles": 29,
  "2 Chronicles": 36,
  Ezra: 10,
  Nehemiah: 13,
  Esther: 10,
  Job: 42,
  Psalm: 150,
  Proverbs: 31,
  Ecclesiastes: 12,
  "Song of Solomon": 8,
  Isaiah: 66,
  Jeremiah: 52,
  Lamentations: 5,
  Ezekiel: 48,
  Daniel: 12,
  Hosea: 14,
  Joel: 3,
  Amos: 9,
  Obadiah: 1,
  Jonah: 4,
  Micah: 7,
  Nahum: 3,
  Habakkuk: 3,
  Zephaniah: 3,
  Haggai: 2,
  Zechariah: 14,
  Malachi: 4,
  Matthew: 28,
  Mark: 16,
  Luke: 24,
  John: 21,
  Acts: 28,
  Romans: 16,
  "1 Corinthians": 16,
  "2 Corinthians": 13,
  Galatians: 6,
  Ephesians: 6,
  Philippians: 4,
  Colossians: 4,
  "1 Thessalonians": 5,
  "2 Thessalonians": 3,
  "1 Timothy": 6,
  "2 Timothy": 4,
  Titus: 3,
  Philemon: 1,
  Hebrews: 13,
  James: 5,
  "1 Peter": 5,
  "2 Peter": 3,
  "1 John": 5,
  "2 John": 1,
  "3 John": 1,
  Jude: 1,
  Revelation: 22,
} as const;

const bookNames = Object.keys(KJV_BOOK_CHAPTERS).sort(
  (left, right) => right.length - left.length,
) as (keyof typeof KJV_BOOK_CHAPTERS)[];

const invisibleOrMalformedText =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00A0\u200B\u200C\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF\uFFFD]/u;
const foreignTranslationLabel =
  /\b(?:NIV|NLT|ESV|NKJV|NASB|CSB|RSV|ASV|WEB)\b/iu;

function issue(recordId: string, message: string): ContentValidationIssue {
  return { recordId, message };
}

export function normalizeDuplicateText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isOrderedPositiveRange(value: string) {
  const numbers = value.split(/[–-]/).map(Number);
  return (
    numbers.length >= 1 &&
    numbers.length <= 2 &&
    numbers.every((number) => Number.isInteger(number) && number > 0) &&
    (numbers.length === 1 || numbers[1] >= numbers[0])
  );
}

export function isValidKjvCitation(reference: string) {
  let activeBook: keyof typeof KJV_BOOK_CHAPTERS | undefined;
  const segments = reference.split(";");
  if (segments.length === 0) return false;

  for (const rawSegment of segments) {
    let segment = rawSegment.trim();
    const namedBook = bookNames.find(
      (book) => segment === book || segment.startsWith(`${book} `),
    );
    if (namedBook) {
      activeBook = namedBook;
      segment = segment.slice(namedBook.length).trim();
    }
    if (!activeBook || !segment) return false;

    const chapterAndVerses = segment.match(/^(\d+):(.+)$/);
    if (chapterAndVerses) {
      const chapter = Number(chapterAndVerses[1]);
      if (chapter < 1 || chapter > KJV_BOOK_CHAPTERS[activeBook]) return false;
      const verseRanges = chapterAndVerses[2].split(",").map((value) => value.trim());
      if (verseRanges.some((value) => !isOrderedPositiveRange(value))) return false;
      continue;
    }

    const chapterRange = segment.split(/[–-]/).map(Number);
    if (
      chapterRange.length < 1 ||
      chapterRange.length > 2 ||
      chapterRange.some(
        (chapter) =>
          !Number.isInteger(chapter) ||
          chapter < 1 ||
          chapter > KJV_BOOK_CHAPTERS[activeBook!],
      ) ||
      (chapterRange.length === 2 && chapterRange[1] < chapterRange[0])
    ) {
      return false;
    }
  }
  return true;
}

function displayedStrings(record: BibleContentRecord) {
  const shared = [record.id, record.reference, record.referenceText];
  if (record.id.startsWith("quiz-")) {
    const quiz = record as QuizContentRecord;
    return [...shared, quiz.question, quiz.answer, ...quiz.choices];
  }
  if (record.id.startsWith("four-pics-")) {
    const puzzle = record as FourPicsContentRecord;
    return [
      ...shared,
      puzzle.answer,
      ...(puzzle.acceptedAnswers ?? []),
      puzzle.explanation,
      ...puzzle.extraLetters,
      ...puzzle.clues.flatMap((clue) => [clue.label, clue.emoji ?? "", clue.scene ?? ""]),
    ];
  }
  const verse = record as VerseBuilderContentRecord;
  return [
    ...shared,
    verse.canonicalText,
    ...verse.segments.flatMap((segment) => [segment.id, segment.text]),
  ];
}

function validateDisplayedStrings(record: BibleContentRecord) {
  const issues: ContentValidationIssue[] = [];
  for (const value of displayedStrings(record)) {
    if (
      value !== value.trim() ||
      value !== value.normalize("NFC") ||
      invisibleOrMalformedText.test(value)
    ) {
      issues.push(issue(record.id, "Displayed content contains malformed Unicode or invisible whitespace."));
      break;
    }
  }
  if (displayedStrings(record).some((value) => foreignTranslationLabel.test(value))) {
    issues.push(issue(record.id, "Displayed content names a non-KJV Bible translation."));
  }
  return issues;
}

export function validateQuizRecord(record: QuizContentRecord) {
  const issues: ContentValidationIssue[] = [];
  if (!/^quiz-\d{3}$/.test(record.id)) {
    issues.push(issue(record.id, "Quiz ID must use the stable quiz-NNN format."));
  }
  if (!record.question.trim() || !record.answer.trim() || !record.referenceText.trim()) {
    issues.push(issue(record.id, "Question, answer, and citation are required."));
  }
  if (record.choices.length !== 4) {
    issues.push(issue(record.id, "Quiz must have four choices."));
  }
  if (record.choices.some((choice) => !choice.trim())) {
    issues.push(issue(record.id, "Quiz choices must be nonempty."));
  }
  const normalizedChoices = record.choices.map(normalizeDuplicateText);
  if (new Set(normalizedChoices).size !== normalizedChoices.length) {
    issues.push(issue(record.id, "Quiz choices must not be duplicated."));
  }
  const answerOccurrences = record.choices.filter(
    (choice) => choice === record.answer,
  ).length;
  if (answerOccurrences !== 1) {
    issues.push(issue(record.id, "Quiz answer must appear exactly once among the choices."));
  }
  if (
    !Number.isInteger(record.correctIndex) ||
    record.correctIndex < 0 ||
    record.correctIndex >= record.choices.length ||
    record.choices[record.correctIndex] !== record.answer
  ) {
    issues.push(issue(record.id, "Quiz answer must match the indexed correct choice."));
  }
  return issues;
}

export function validateFourPicsRecord(record: FourPicsContentRecord) {
  const issues: ContentValidationIssue[] = [];
  const answer = normalizeAnswer(record.answer);
  if (!answer || !/^[A-Z]+$/.test(answer)) {
    issues.push(issue(record.id, "Four Pics answer must contain Latin letters."));
  }
  if (record.id !== `four-pics-${answer.toLowerCase()}`) {
    issues.push(issue(record.id, "Four Pics ID must be derived from its stable normalized answer."));
  }
  if (!record.referenceText.trim() || !record.explanation.trim()) {
    issues.push(issue(record.id, "Four Pics answer, citation, and explanation are required."));
  }
  if (record.clues.length !== 4) {
    issues.push(issue(record.id, "Four Pics records must have exactly four clues."));
  }
  const clueLabels = record.clues.map((clue) => normalizeDuplicateText(clue.label));
  if (clueLabels.some((label) => !label) || new Set(clueLabels).size !== clueLabels.length) {
    issues.push(issue(record.id, "Four Pics clue labels must be nonempty and unique."));
  }
  if (
    record.clues.some(
      (clue) => Boolean(clue.emoji) === Boolean(clue.scene),
    )
  ) {
    issues.push(issue(record.id, "Each Four Pics clue must define exactly one visual."));
  }
  if (
    record.extraLetters.length === 0 ||
    record.extraLetters.some((letter) => normalizeAnswer(letter).length !== 1)
  ) {
    issues.push(issue(record.id, "Four Pics extra letters must be nonempty single letters."));
  }
  const acceptedAnswers = (record.acceptedAnswers ?? []).map(normalizeAnswer);
  if (
    acceptedAnswers.some((accepted) => !accepted || accepted === answer) ||
    new Set(acceptedAnswers).size !== acceptedAnswers.length
  ) {
    issues.push(issue(record.id, "Four Pics accepted answers must be unique alternatives."));
  }
  return issues;
}

export function validateVerseBuilderRecord(record: VerseBuilderContentRecord) {
  const issues: ContentValidationIssue[] = [];
  if (!/^verse-builder-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(record.id)) {
    issues.push(issue(record.id, "Verse Builder IDs must use the stable verse-builder-* format."));
  }
  if (record.schemaVersion !== CONTENT_SCHEMA_VERSION) {
    issues.push(issue(record.id, "Unsupported Verse Builder content schema version."));
  }
  if (
    !record.reference.trim() ||
    record.reference !== record.referenceText ||
    !isValidKjvCitation(record.referenceText)
  ) {
    issues.push(issue(record.id, "Reference must use a canonical KJV citation."));
  }
  if (!record.canonicalText.trim()) {
    issues.push(issue(record.id, "Canonical KJV verse text is required."));
  }
  if (record.segments.length < 3 || record.segments.length > 12) {
    issues.push(issue(record.id, "Verse Builder requires 3 to 12 segments."));
  }
  const segmentIds = record.segments.map((segment) => segment.id);
  if (
    segmentIds.some((id) => !id.trim()) ||
    new Set(segmentIds).size !== segmentIds.length
  ) {
    issues.push(issue(record.id, "Segment IDs must be unique."));
  }
  if (record.segments.some((segment) => !segment.text.trim() || segment.text !== segment.text.trim())) {
    issues.push(issue(record.id, "Segment text must be non-empty and trimmed."));
  }
  const reconstructed = normalizeVerseBuilderText(
    record.segments.map((segment) => segment.text).join(" "),
  );
  if (reconstructed !== normalizeVerseBuilderText(record.canonicalText)) {
    issues.push(issue(record.id, "Normalized segments must reconstruct canonical verse text exactly."));
  }
  if (record.difficulty !== deriveVerseBuilderDifficulty(record.canonicalText, record.segments)) {
    issues.push(issue(record.id, "Difficulty does not match the deterministic Verse Builder formula."));
  }
  if (!record.contentPackIds.length || !record.contentPackIds.includes("kjventure-core")) {
    issues.push(issue(record.id, "Verse Builder record must belong to the core content pack."));
  }
  if (!record.validation.sourceNote?.trim()) {
    issues.push(issue(record.id, "Verse Builder source provenance is required."));
  }
  if (
    record.validation.status === "reviewed" &&
    (!record.validation.reviewer?.trim() || !record.validation.reviewedAt?.trim())
  ) {
    issues.push(issue(record.id, "Reviewed Verse Builder records require reviewer and review date metadata."));
  }
  return issues;
}

export function validateVerseBuilderRecords(records: readonly VerseBuilderContentRecord[]) {
  const issues: ContentValidationIssue[] = [];
  const ids = new Set<string>();
  const canonicalTexts = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) {
      issues.push(issue(record.id, "Duplicate Verse Builder content ID."));
    }
    ids.add(record.id);
    const canonical = normalizeVerseBuilderText(record.canonicalText).toLocaleLowerCase("en");
    if (canonicalTexts.has(canonical)) {
      issues.push(issue(record.id, "Duplicate Verse Builder canonical verse in content pack."));
    }
    canonicalTexts.add(canonical);
    issues.push(...validateVerseBuilderRecord(record));
  }
  return issues;
}

export function validateContentRecords(records: readonly BibleContentRecord[]) {
  const issues: ContentValidationIssue[] = [];
  const ids = new Set<string>();
  const quizPrompts = new Map<string, string>();
  const fourPicsAnswers = new Set<string>();
  const verseBuilderCanonicalTexts = new Set<string>();

  for (const record of records) {
    if (!record.id.trim()) issues.push(issue(record.id, "Content ID is required."));
    if (ids.has(record.id)) issues.push(issue(record.id, "Duplicate content ID."));
    ids.add(record.id);
    if (record.schemaVersion !== CONTENT_SCHEMA_VERSION) {
      issues.push(issue(record.id, "Unsupported content schema version."));
    }
    if (!record.contentPackIds.includes("kjventure-core")) {
      issues.push(issue(record.id, "Record is missing core pack membership."));
    }
    if (record.reference !== record.referenceText) {
      issues.push(issue(record.id, "Visible reference and citation metadata must match."));
    }
    if (!isValidKjvCitation(record.referenceText)) {
      issues.push(issue(record.id, "Citation must use a canonical KJV book and valid range format."));
    }
    issues.push(...validateDisplayedStrings(record));

    if (record.id.startsWith("quiz-")) {
      const quiz = record as QuizContentRecord;
      const prompt = normalizeDuplicateText(quiz.question);
      const priorAnswer = quizPrompts.get(prompt);
      if (priorAnswer !== undefined) {
        issues.push(issue(record.id, "Duplicate quiz prompt after punctuation and case normalization."));
        if (priorAnswer !== normalizeDuplicateText(quiz.answer)) {
          issues.push(issue(record.id, "Contradictory duplicate quiz prompt has a different answer."));
        }
      }
      quizPrompts.set(prompt, normalizeDuplicateText(quiz.answer));
      issues.push(...validateQuizRecord(quiz));
    } else if (record.id.startsWith("four-pics-")) {
      const puzzle = record as FourPicsContentRecord;
      const answer = normalizeAnswer(puzzle.answer);
      if (fourPicsAnswers.has(answer)) {
        issues.push(issue(record.id, "Duplicate Four Pics answer."));
      }
      fourPicsAnswers.add(answer);
      issues.push(...validateFourPicsRecord(puzzle));
    } else if (record.id.startsWith("verse-builder-")) {
      const verse = record as VerseBuilderContentRecord;
      const canonical = normalizeVerseBuilderText(verse.canonicalText).toLocaleLowerCase("en");
      if (verseBuilderCanonicalTexts.has(canonical)) {
        issues.push(issue(record.id, "Duplicate Verse Builder canonical verse in content pack."));
      }
      verseBuilderCanonicalTexts.add(canonical);
      issues.push(...validateVerseBuilderRecord(verse));
    } else {
      issues.push(issue(record.id, "Unsupported content record ID format."));
    }
  }
  return issues;
}
