import { verseBuilderContentRecords } from "../../content/registry";
import { prepareSequence } from "../sequence/sequenceEngine";
import { shuffle } from "../../utils";
import type { PreparedVerseBuilderRound } from "../../session/types";
import {
  DEFAULT_VERSE_BUILDER_SETTINGS,
  LEGACY_VERSE_BUILDER_SETTINGS,
  type VerseBuilderSettings,
} from "./verseBuilderTypes";
import { selectMissingWordTokenIndices, tokenizeVerse } from "./missing-words/missingWordsEngine";

export function prepareVerseBuilderRounds(
  count: number,
  order: "random" | "source" = "random",
  settingsOrRandom: VerseBuilderSettings | (() => number) = DEFAULT_VERSE_BUILDER_SETTINGS,
  random: () => number = Math.random,
): PreparedVerseBuilderRound[] {
  const settings = typeof settingsOrRandom === "function" ? LEGACY_VERSE_BUILDER_SETTINGS : settingsOrRandom;
  const rng = typeof settingsOrRandom === "function" ? settingsOrRandom : random;
  const source = order === "random"
    ? shuffle(verseBuilderContentRecords, rng)
    : [...verseBuilderContentRecords];

  return source.slice(0, Math.max(0, Math.min(count, verseBuilderContentRecords.length))).map(
    (record) => {
      if (settings.playStyle === "missing-words") {
        const tokens = tokenizeVerse(record.canonicalText);
        return {
          id: record.id,
          playlistItemId: "",
          contentId: record.id,
          gameId: "verse-builder" as const,
          playStyle: "missing-words" as const,
          difficulty: settings.missingWordsDifficulty,
          timerSeconds: null,
          expiryBehavior: "require-reveal" as const,
          blankTokenIndices: selectMissingWordTokenIndices(tokens, record.id, settings.missingWordsDifficulty),
        };
      }
      const sequence = prepareSequence(record.segments, rng);
      return {
        id: record.id,
        playlistItemId: "",
        contentId: record.id,
        gameId: "verse-builder",
        playStyle: "verse-order" as const,
        timerSeconds: null,
        expiryBehavior: "require-reveal",
        canonicalSegmentIds: [...sequence.canonicalIds],
        shuffledSegmentIds: [...sequence.shuffledIds],
      };
    },
  );
}
