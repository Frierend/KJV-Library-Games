import { verseBuilderContentRecords } from "../../content/registry";
import { prepareSequence } from "../sequence/sequenceEngine";
import { shuffle } from "../../utils";
import type { PreparedVerseBuilderRound } from "../../session/types";

export function prepareVerseBuilderRounds(
  count: number,
  order: "random" | "source" = "random",
  random: () => number = Math.random,
): PreparedVerseBuilderRound[] {
  const source = order === "random"
    ? shuffle(verseBuilderContentRecords, random)
    : [...verseBuilderContentRecords];

  return source.slice(0, Math.max(0, Math.min(count, verseBuilderContentRecords.length))).map(
    (record) => {
      const sequence = prepareSequence(record.segments, random);
      return {
        id: record.id,
        playlistItemId: "",
        contentId: record.id,
        gameId: "verse-builder",
        timerSeconds: null,
        expiryBehavior: "require-reveal",
        canonicalSegmentIds: [...sequence.canonicalIds],
        shuffledSegmentIds: [...sequence.shuffledIds],
      };
    },
  );
}
