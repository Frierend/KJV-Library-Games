import type { FourPicsPuzzle } from "../../types/games";
import { normalizeAnswer, shuffle } from "../../utils";

export const MAX_FOUR_PICS_ROUNDS = 30;

export interface LetterTile {
  id: string;
  character: string;
}

export interface PreparedPuzzle {
  puzzle: FourPicsPuzzle;
  hintPositions: readonly number[];
  letterTiles: readonly LetterTile[];
}

export type AnswerSlotKind = "empty" | "hint" | "player" | "revealed";

export interface AnswerSlot {
  character: string;
  kind: AnswerSlotKind;
}

export function hintCountForAnswer(answer: string) {
  return normalizeAnswer(answer).length >= 6 ? 2 : 1;
}

export function selectHintPositions(
  answer: string,
  random: () => number = Math.random,
): number[] {
  const length = normalizeAnswer(answer).length;
  if (length === 0) return [];

  const first = Math.floor(random() * length);
  if (hintCountForAnswer(answer) === 1) return [first];

  const allOtherPositions = Array.from(
    { length },
    (_, position) => position,
  ).filter((position) => position !== first);
  const nonAdjacentPositions = allOtherPositions.filter(
    (position) => Math.abs(position - first) > 1,
  );
  const candidates =
    nonAdjacentPositions.length > 0 ? nonAdjacentPositions : allOtherPositions;
  const second = candidates[Math.floor(random() * candidates.length)];

  return [first, second].sort((left, right) => left - right);
}

export function requiredAnswerLetters(
  answer: string,
  hintPositions: readonly number[],
) {
  const hints = new Set(hintPositions);
  return [...normalizeAnswer(answer)].filter((_, position) => !hints.has(position));
}

export function createLetterTiles(
  puzzle: FourPicsPuzzle,
  hintPositions: readonly number[],
  roundKey: string,
  random: () => number = Math.random,
): LetterTile[] {
  const characters = [
    ...requiredAnswerLetters(puzzle.answer, hintPositions),
    ...puzzle.extraLetters.flatMap((letter) => [...normalizeAnswer(letter)]),
  ];

  return shuffle(
    characters.map((character, tileIndex) => ({
      id: `${roundKey}-${tileIndex}-${character}`,
      character,
    })),
    random,
  );
}

export function preparePuzzleSession(
  puzzles: readonly FourPicsPuzzle[],
  count: number,
  sessionKey: string,
  random: () => number = Math.random,
): PreparedPuzzle[] {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > MAX_FOUR_PICS_ROUNDS ||
    count > puzzles.length
  ) {
    throw new RangeError(`Puzzle count must be from 1 to ${MAX_FOUR_PICS_ROUNDS}.`);
  }

  return shuffle(puzzles, random)
    .slice(0, count)
    .map((puzzle, roundIndex) => {
      const roundKey = `${sessionKey}-${roundIndex}-${normalizeAnswer(puzzle.answer)}`;
      const hintPositions = selectHintPositions(puzzle.answer, random);
      return {
        puzzle,
        hintPositions,
        letterTiles: createLetterTiles(
          puzzle,
          hintPositions,
          roundKey,
          random,
        ),
      };
    });
}

export function buildAnswerSlots(
  answer: string,
  hintPositions: readonly number[],
  playerLetters: readonly string[],
  revealed = false,
): AnswerSlot[] {
  const characters = [...normalizeAnswer(answer)];
  const hints = new Set(hintPositions);
  let playerIndex = 0;

  return characters.map((correctCharacter, position) => {
    if (hints.has(position)) {
      return { character: correctCharacter, kind: "hint" };
    }
    if (revealed) {
      return { character: correctCharacter, kind: "revealed" };
    }

    const character = playerLetters[playerIndex] ?? "";
    playerIndex += 1;
    return {
      character,
      kind: character ? "player" : "empty",
    };
  });
}

export function playerLetterCapacity(
  answer: string,
  hintPositions: readonly number[],
) {
  return Math.max(0, normalizeAnswer(answer).length - hintPositions.length);
}

export function appendPlayerLetter(
  playerLetters: readonly string[],
  character: string,
  answer: string,
  hintPositions: readonly number[],
) {
  if (playerLetters.length >= playerLetterCapacity(answer, hintPositions)) {
    return [...playerLetters];
  }
  return [...playerLetters, character];
}

export function removeLastPlayerLetter(playerLetters: readonly string[]) {
  return playerLetters.slice(0, -1);
}

export function answerFromSlots(slots: readonly AnswerSlot[]) {
  return slots.map((slot) => slot.character).join("");
}

export function roundCountError(value: string) {
  const parsed = Number(value);
  if (
    value.trim() === "" ||
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > MAX_FOUR_PICS_ROUNDS
  ) {
    return `Enter a whole number from 1 to ${MAX_FOUR_PICS_ROUNDS}.`;
  }
  return "";
}
