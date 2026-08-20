import { describe, expect, it } from "vitest";
import {
  createLetterTiles,
  preparePuzzleSession,
  requiredAnswerLetters,
  selectHintPositions,
} from "../games/four-pics/fourPicsLogic";
import { normalizeAnswer } from "../utils";
import { fourPicsPuzzles } from "./fourPicsPuzzles";

describe("4 Pics puzzle data", () => {
  it("contains exactly 30 complete puzzles with unique normalized answers", () => {
    expect(fourPicsPuzzles).toHaveLength(30);

    const answers = fourPicsPuzzles.map((puzzle) =>
      normalizeAnswer(puzzle.answer),
    );
    expect(answers.every(Boolean)).toBe(true);
    expect(new Set(answers)).toHaveLength(30);

    for (const puzzle of fourPicsPuzzles) {
      expect(puzzle.reference.trim()).not.toBe("");
      expect(puzzle.explanation.trim()).not.toBe("");
      expect(puzzle.extraLetters.length).toBeGreaterThan(0);
      expect(puzzle.clues).toHaveLength(4);
      for (const clue of puzzle.clues) {
        const visual = "emoji" in clue ? clue.emoji.trim() : clue.scene;
        expect(visual).toBeTruthy();
        expect(clue.label.trim()).not.toBe("");
        expect(["gold", "blue", "green", "purple"]).toContain(clue.tone);
      }
    }
  });

  it("can generate a solvable occurrence-aware letter bank for every puzzle", () => {
    for (const puzzle of fourPicsPuzzles) {
      const hints = selectHintPositions(puzzle.answer, () => 0.37);
      const tiles = createLetterTiles(puzzle, hints, "integrity", () => 0.41);
      const available = tiles.map((tile) => tile.character);

      for (const required of requiredAnswerLetters(puzzle.answer, hints)) {
        const occurrence = available.indexOf(required);
        expect(occurrence, `${puzzle.answer} is missing ${required}`).toBeGreaterThanOrEqual(0);
        available.splice(occurrence, 1);
      }
    }
  });

  it("keeps every possible hint-position letter bank complete", () => {
    for (const puzzle of fourPicsPuzzles) {
      const answerLength = normalizeAnswer(puzzle.answer).length;
      const hintSets = Array.from({ length: answerLength }, (_, first) =>
        answerLength < 6
          ? [[first]]
          : Array.from({ length: answerLength }, (_, second) => second)
              .filter((second) => second !== first)
              .map((second) => [first, second].sort((left, right) => left - right)),
      ).flat();
      const uniqueHintSets = [
        ...new Map(hintSets.map((hints) => [hints.join(","), hints])).values(),
      ];

      for (const hints of uniqueHintSets) {
        const tiles = createLetterTiles(puzzle, hints, "all-hint-positions", () => 0.5);
        const available = tiles.map((tile) => tile.character);
        const required = requiredAnswerLetters(puzzle.answer, hints);
        expect(tiles).toHaveLength(required.length + puzzle.extraLetters.length);
        for (const character of required) {
          const occurrence = available.indexOf(character);
          expect(
            occurrence,
            `${puzzle.answer} with hints ${hints.join(",")} is missing ${character}`,
          ).toBeGreaterThanOrEqual(0);
          available.splice(occurrence, 1);
        }
      }
    }
  });

  it("samples a 30-round session without repeating a puzzle", () => {
    const rounds = preparePuzzleSession(
      fourPicsPuzzles,
      30,
      "all-puzzles",
      () => 0.43,
    );
    expect(rounds).toHaveLength(30);
    expect(
      new Set(rounds.map(({ puzzle }) => normalizeAnswer(puzzle.answer))),
    ).toHaveLength(30);
  });
});
