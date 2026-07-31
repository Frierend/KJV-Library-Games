export type AppScreen =
  | "library"
  | "quiz-setup"
  | "quiz"
  | "four-pics-setup"
  | "four-pics";

export type TimerDuration = 10 | 15 | 20 | 30;

export interface QuizQuestion {
  question: string;
  choices: readonly [string, string, string, string];
  correctIndex: number;
  answer: string;
  reference: string;
}

export interface FourPicsPuzzle {
  answer: string;
  acceptedAnswers?: readonly string[];
  reference: string;
  explanation: string;
  clues: readonly [PictureClue, PictureClue, PictureClue, PictureClue];
  extraLetters: readonly string[];
}

export interface PictureClue {
  emoji?: string;
  scene?:
    | "storm"
    | "pasture"
    | "wilderness"
    | "walls"
    | "cave"
    | "calvary"
    | "night-path"
    | "tower"
    | "mountain-fire"
    | "field";
  label: string;
  tone: "gold" | "blue" | "green" | "purple";
}
