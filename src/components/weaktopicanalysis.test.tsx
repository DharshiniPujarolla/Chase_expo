import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WeakTopicAnalysis from "@/components/weaktopicanalysis";
import {
  answerQuestion,
  INITIAL_PROGRESS,
  QUESTIONS,
  type Subject,
} from "@/lib/chase-game";

describe("Learning Analysis", () => {
  it("shows a new-student prompt without fabricated mastery", () => {
    render(<WeakTopicAnalysis progress={INITIAL_PROGRESS} onPractice={vi.fn()} />);

    expect(screen.getByText("Start a challenge to see progress for each STEM concept.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start a Physics challenge" })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/% mastery/)).not.toBeInTheDocument();
  });

  it("keeps concepts separate, recommends the weak concept, and records retries per question", () => {
    const linearQuestions = QUESTIONS.filter(
      (question) =>
        question.subject === "mathematics" &&
        question.concept === "Linear equations" &&
        question.level === 1,
    );
    const areaQuestions = QUESTIONS.filter(
      (question) =>
        question.subject === "mathematics" &&
        question.concept === "Area",
    );
    let progress = INITIAL_PROGRESS;

    for (const question of linearQuestions.slice(0, 2)) {
      progress = answerQuestion(
        progress,
        question,
        question.options.find((option) => option !== question.answer)!,
      ).progress;
    }
    for (const question of areaQuestions) {
      progress = answerQuestion(progress, question, question.answer).progress;
    }
    progress = answerQuestion(
      progress,
      linearQuestions[0]!,
      linearQuestions[0]!.answer,
      { retry: true },
    ).progress;

    const onPractice = vi.fn<(subject: Subject, conceptId: string) => void>();
    render(<WeakTopicAnalysis progress={progress} onPractice={onPractice} />);

    expect(screen.getByText((content) => content.includes("Needs practice"))).toBeInTheDocument();
    expect(screen.getAllByText("Linear equations").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Area").length).toBeGreaterThan(0);
    expect(
      screen.getByText((content) =>
        content.includes("2") &&
        content.includes("independent") &&
        content.includes("0 correct") &&
        content.includes("2 incorrect") &&
        content.includes("1 retry"),
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Practice Linear equations" }));
    expect(onPractice).toHaveBeenCalledWith("mathematics", linearQuestions[0]!.conceptId);

    fireEvent.click(screen.getAllByText("Attempts by question")[0]!);
    expect(screen.getByText(`${linearQuestions[0]!.prompt} · 2 attempts`)).toBeInTheDocument();
    expect(progress.subjectStats.mathematics.concepts[linearQuestions[0]!.conceptId]?.attempts).toBe(2);
    expect(progress.subjectStats.mathematics.concepts[areaQuestions[0]!.conceptId]?.attempts).toBe(2);
  });
});
