import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { quizQuestions } from "../../data/quizQuestions";
import QuizGame from "./QuizGame";

describe("KJV Bible Quiz", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retains all 100 existing quiz questions", () => {
    expect(quizQuestions).toHaveLength(100);
  });

  it("recovers from a wrong answer and can reset the same round", async () => {
    render(<QuizGame onExit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "10" }));
    fireEvent.click(screen.getByRole("button", { name: /start quiz/i }));

    expect(screen.getByText(/question 1 of 10/i)).toBeInTheDocument();
    expect(screen.getByText("0:15")).toBeInTheDocument();

    const heading = screen.getByRole("heading", { level: 1 });
    const question = quizQuestions.find(
      (candidate) => candidate.question === heading.textContent,
    );
    expect(question).toBeDefined();
    if (!question) return;

    const wrongChoiceIndex = question.choices.findIndex(
      (_, choiceIndex) => choiceIndex !== question.correctIndex,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(question.choices[wrongChoiceIndex], "i"),
      }),
    );
    expect(screen.getByText("Wrong answer.")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.queryByText("Wrong answer.")).not.toBeInTheDocument();
      },
      { timeout: 2_000 },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(question.choices[question.correctIndex], "i"),
      }),
    );
    expect(screen.getByText(/correct!/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reset timer/i }));
    expect(screen.queryByText(/correct!/i)).not.toBeInTheDocument();
    expect(screen.getByText("0:15")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Setup" }));
    expect(screen.getByRole("button", { name: /start quiz/i })).toBeInTheDocument();
  });

  it("uses a valid custom question total", () => {
    render(<QuizGame onExit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    const input = screen.getByRole("spinbutton", { name: /custom number of questions/i });
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /start quiz/i }));

    expect(screen.getByText(/question 1 of 3/i)).toBeInTheDocument();
  });

  it("moves focus to the active question when play starts", () => {
    render(<QuizGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "10" }));
    fireEvent.click(screen.getByRole("button", { name: /start quiz/i }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    expect(screen.getByRole("heading", { level: 1 })).toHaveAttribute("tabindex", "-1");
  });

  it("does not advance before resolution and rejects rapid repeat navigation", () => {
    render(<QuizGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "10" }));
    fireEvent.click(screen.getByRole("button", { name: /start quiz/i }));

    const next = screen.getByRole("button", { name: /^next/i });
    expect(next).toBeDisabled();
    fireEvent.click(next);
    expect(screen.getByText(/question 1 of 10/i)).toBeInTheDocument();

    const heading = screen.getByRole("heading", { level: 1 });
    const question = quizQuestions.find(
      (candidate) => candidate.question === heading.textContent,
    );
    expect(question).toBeDefined();
    if (!question) return;
    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(question.choices[question.correctIndex], "i"),
      }),
    );
    expect(next).toBeEnabled();
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByText(/question 2 of 10/i)).toBeInTheDocument();
  });

  it("keeps a revealed answer resolved after a pending wrong-answer timeout", () => {
    vi.useFakeTimers();
    render(<QuizGame onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "10" }));
    fireEvent.click(screen.getByRole("button", { name: /start quiz/i }));

    const heading = screen.getByRole("heading", { level: 1 });
    const question = quizQuestions.find(
      (candidate) => candidate.question === heading.textContent,
    );
    expect(question).toBeDefined();
    if (!question) return;

    const wrongChoice = question.choices.find(
      (_, choiceIndex) => choiceIndex !== question.correctIndex,
    );
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(wrongChoice ?? "", "i") }),
    );
    fireEvent.click(screen.getByRole("button", { name: /reveal answer/i }));
    act(() => {
      vi.advanceTimersByTime(1_500);
    });

    expect(screen.getByText(/^Answer:/)).toBeInTheDocument();
  });
});
