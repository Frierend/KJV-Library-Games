import { quizContentRecords } from "../../content/registry";
import { shuffle } from "../../utils";

export function prepareQuizRounds(
  count: number,
  order: "random" | "source" = "random",
  random: () => number = Math.random,
) {
  const source = order === "random" ? shuffle(quizContentRecords, random) : [...quizContentRecords];
  return source.slice(0, count);
}
