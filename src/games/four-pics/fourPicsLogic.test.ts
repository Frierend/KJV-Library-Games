import { describe, expect, it } from "vitest";
import type { FourPicsPuzzle } from "../../types/games";
import {
  answerFromSlots,
  appendPlayerLetter,
  buildAnswerSlots,
  createLetterTiles,
  hintCountForAnswer,
  preparePuzzleSession,
  removeLastPlayerLetter,
  requiredAnswerLetters,
  roundCountError,
  selectHintPositions,
} from "./fourPicsLogic";

const mannaPuzzle: FourPicsPuzzle = {
  answer: "MANNA",
  reference: "Exodus 16:14–15",
  explanation: "Bread from heaven.",
  extraLetters: ["B", "R", "E", "D"],
  clues: [
    { scene: "wilderness", label: "Wilderness", tone: "gold" },
    { emoji: "❄️", label: "Small flakes", tone: "blue" },
    { emoji: "🧺", label: "Gathered daily", tone: "purple" },
    { emoji: "🍞", label: "Bread from heaven", tone: "green" },
  ],
};

describe("4 Pics answer clues", () => {
  it.each(["ARK", "LAMP", "MANNA"])(
    "gives 3–5 character answer %s exactly one hint",
    (answer) => {
      const positions = selectHintPositions(answer, () => 0.72);
      expect(hintCountForAnswer(answer)).toBe(1);
      expect(positions).toHaveLength(1);
      expect(positions[0]).toBeGreaterThanOrEqual(0);
      expect(positions[0]).toBeLessThan(answer.length);
    },
  );

  it.each(["ARMOUR", "SHEPHERD", "PENTECOST"])(
    "gives 6+ character answer %s two valid, distinct hints",
    (answer) => {
      const positions = selectHintPositions(answer, () => 0.31);
      expect(hintCountForAnswer(answer)).toBe(2);
      expect(positions).toHaveLength(2);
      expect(new Set(positions)).toHaveLength(2);
      expect(
        positions.every((position) => position >= 0 && position < answer.length),
      ).toBe(true);
    },
  );

  it("prefers nonadjacent positions when two clues are possible", () => {
    const positions = selectHintPositions("ARMOUR", () => 0);
    expect(Math.abs(positions[0] - positions[1])).toBeGreaterThan(1);
  });

  it("builds player input into the next non-hint slots", () => {
    const slots = buildAnswerSlots("MANNA", [1], ["M", "N", "N", "A"]);
    expect(slots.map((slot) => slot.character)).toEqual([
      "M",
      "A",
      "N",
      "N",
      "A",
    ]);
    expect(slots.map((slot) => slot.kind)).toEqual([
      "player",
      "hint",
      "player",
      "player",
      "player",
    ]);
  });

  it("delete removes only the latest player-controlled letter", () => {
    const playerLetters = removeLastPlayerLetter(["M", "N"]);
    const slots = buildAnswerSlots("MANNA", [1], playerLetters);
    expect(playerLetters).toEqual(["M"]);
    expect(slots[1]).toEqual({ character: "A", kind: "hint" });
    expect(answerFromSlots(slots)).toBe("MA");
  });

  it("does not accept more player letters than open slots", () => {
    const full = ["M", "N", "N", "A"];
    expect(appendPlayerLetter(full, "X", "MANNA", [1])).toEqual(full);
  });

  it("removes revealed occurrences by position instead of by character value", () => {
    expect(requiredAnswerLetters("MANNA", [2])).toEqual(["M", "A", "N", "A"]);
    expect(requiredAnswerLetters("MANNA", [1])).toEqual(["M", "N", "N", "A"]);
  });

  it("keeps repeated-letter answers solvable after creating the bank", () => {
    const tiles = createLetterTiles(mannaPuzzle, [2], "manna", () => 0.4);
    const available = tiles.map((tile) => tile.character);
    for (const required of requiredAnswerLetters("MANNA", [2])) {
      const occurrence = available.indexOf(required);
      expect(occurrence).toBeGreaterThanOrEqual(0);
      available.splice(occurrence, 1);
    }
  });

  it("reveal fills every non-hint slot while preserving hint slots", () => {
    const slots = buildAnswerSlots("MANNA", [2], [], true);
    expect(answerFromSlots(slots)).toBe("MANNA");
    expect(slots[2].kind).toBe("hint");
    expect(slots.filter((slot) => slot.kind === "revealed")).toHaveLength(4);
  });
});

describe("4 Pics session preparation", () => {
  it("keeps prepared hints and letter tiles stable for a round", () => {
    const [round] = preparePuzzleSession(
      [mannaPuzzle],
      1,
      "stable",
      () => 0.42,
    );
    const originalHints = [...round.hintPositions];
    const originalTileIds = round.letterTiles.map((tile) => tile.id);

    expect(round.hintPositions).toEqual(originalHints);
    expect(round.letterTiles.map((tile) => tile.id)).toEqual(originalTileIds);
  });

  it.each(["", "0", "-1", "2.5", "31"])(
    "rejects invalid custom round value %j",
    (value) => {
      expect(roundCountError(value)).toBe(
        "Enter a whole number from 1 to 30.",
      );
    },
  );

  it.each(["1", "20", "30"])("accepts custom round value %s", (value) => {
    expect(roundCountError(value)).toBe("");
  });
});
