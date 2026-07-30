import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve(
  "..",
  "KJV_Bible_Trivia_Host_Mode_v5_SELECTABLE_QUESTIONS.html",
);
const destinationPath = resolve("src/data/quizQuestions.ts");
const html = readFileSync(sourcePath, "utf8");
const start = html.indexOf("const questionBank =");
const end = html.indexOf("let questions =", start);

if (start === -1 || end === -1) {
  throw new Error("Could not locate the question bank in the existing game.");
}

const source = html
  .slice(start, end)
  .replace("const questionBank =", "return ")
  .replace(/;\s*$/, "");
const tuples = Function(source)();

if (!Array.isArray(tuples) || tuples.length !== 100) {
  throw new Error(`Expected 100 questions, received ${tuples?.length ?? 0}.`);
}

const questions = tuples.map(
  ([question, choices, correctIndex, answer, reference]) => ({
    question,
    choices,
    correctIndex,
    answer,
    reference,
  }),
);

const output = `import type { QuizQuestion } from "../types/games";

export const quizQuestions = ${JSON.stringify(questions, null, 2)} satisfies readonly QuizQuestion[];
`;

writeFileSync(destinationPath, output);
console.log(`Migrated ${questions.length} KJV Bible quiz questions.`);
