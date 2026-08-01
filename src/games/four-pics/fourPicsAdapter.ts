import { fourPicsContentRecords } from "../../content/registry";
import { shuffle } from "../../utils";
import {
  createLetterTiles,
  selectHintPositions,
  type PreparedPuzzle,
} from "./fourPicsLogic";

export interface PreparedContentPuzzle extends PreparedPuzzle {
  contentId: string;
}

export function prepareFourPicsRounds(
  count: number,
  sessionKey: string,
  order: "random" | "source" = "random",
  random: () => number = Math.random,
): PreparedContentPuzzle[] {
  const source =
    order === "random"
      ? shuffle(fourPicsContentRecords, random)
      : [...fourPicsContentRecords];
  return source.slice(0, count).map((puzzle, index) => {
    const hintPositions = selectHintPositions(puzzle.answer, random);
    return {
      contentId: puzzle.id,
      puzzle,
      hintPositions,
      letterTiles: createLetterTiles(
        puzzle,
        hintPositions,
        `${sessionKey}-${index}-${puzzle.id}`,
        random,
      ),
    };
  });
}
