import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Route } from "./index";
import {
  answerQuestion,
  getNextQuestionSelection,
  INITIAL_PROGRESS,
  QUESTIONS,
  type GameProgress,
} from "@/lib/chase-game";

describe("CHASE mission question progression", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the actual STEM Buddy conversation to Gemini and uses the response in follow-ups", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ answer: "Newton's second law is F = m × a." }))
      .mockResolvedValueOnce(Response.json({ answer: "The code checks divisors one at a time." }));
    const Mission = Route.options.component;
    if (!Mission) throw new Error("The home route has no mission component.");
    render(<Mission />);

    fireEvent.click(screen.getByRole("button", { name: "Open Stem Buddy" }));
    const input = screen.getByRole("textbox", { name: "Ask Stem Buddy a question" });
    fireEvent.change(input, { target: { value: "Explain Newton's second law with an example." } });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    expect(await screen.findByText("Newton's second law is F = m × a.")).toBeInTheDocument();
    expect(input).toHaveValue("");
    const firstRequest = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(firstRequest.messages.at(-1)).toEqual({
      role: "user",
      content: "Explain Newton's second law with an example.",
    });

    fireEvent.change(input, { target: { value: "Explain the code line by line." } });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    expect(await screen.findByText("The code checks divisors one at a time.")).toBeInTheDocument();

    const followUpRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(followUpRequest.messages).toContainEqual({
      role: "assistant",
      content: "Newton's second law is F = m × a.",
    });
    expect(followUpRequest.messages.at(-1)).toEqual({
      role: "user",
      content: "Explain the code line by line.",
    });
  });

  it("shows a helpful AI error without falling back to a predefined answer", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("connection refused"));
    const Mission = Route.options.component;
    if (!Mission) throw new Error("The home route has no mission component.");
    render(<Mission />);

    fireEvent.click(screen.getByRole("button", { name: "Open Stem Buddy" }));
    const input = screen.getByRole("textbox", { name: "Ask Stem Buddy a question" });
    fireEvent.change(input, { target: { value: "Explain Ohm's law." } });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    expect(await screen.findByText("Stem Buddy could not reach the AI endpoint. Check the development server connection.")).toBeInTheDocument();
    expect(input).toHaveValue("Explain Ohm's law.");
    expect(screen.queryByText(/offline demo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/V = I × R/)).not.toBeInTheDocument();
  });

  it("shows a typing state and blocks duplicate chat submissions while Gemini is pending", async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const Mission = Route.options.component;
    if (!Mission) throw new Error("The home route has no mission component.");
    render(<Mission />);

    fireEvent.click(screen.getByRole("button", { name: "Open Stem Buddy" }));
    const input = screen.getByRole("textbox", { name: "Ask Stem Buddy a question" });
    fireEvent.change(input, { target: { value: "Explain a concept." } });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    expect(screen.getByRole("status")).toHaveTextContent("Connecting to Stem Buddy");
    expect(input).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRequest?.(Response.json({ answer: "Here is a clear explanation." }));
    expect(await screen.findByText("Here is a clear explanation.")).toBeInTheDocument();
    expect(input).toBeEnabled();
  });

  it("shows the adaptive selector's next question and advances after two correct answers", async () => {
    const first = getNextQuestionSelection(INITIAL_PROGRESS, "physics");
    expect(first).not.toBeNull();
    const afterFirst = answerQuestion(
      INITIAL_PROGRESS,
      first!.question,
      first!.question.answer,
    ).progress;
    const second = getNextQuestionSelection(afterFirst, "physics", first!.question.id);
    expect(second).not.toBeNull();
    const afterSecond = answerQuestion(
      afterFirst,
      second!.question,
      second!.question.answer,
    ).progress;
    const third = getNextQuestionSelection(afterSecond, "physics", second!.question.id);
    expect(third?.question.level).toBe(2);

    const Mission = Route.options.component;
    if (!Mission) throw new Error("The home route has no mission component.");
    render(<Mission />);

    fireEvent.click(await screen.findByRole("button", { name: /LET'S GO/i }));
    expect(await screen.findByText(first!.question.prompt)).toBeInTheDocument();

    const chooseAnswer = (answer: string) => {
      const button = screen
        .getAllByRole("button")
        .find((item) => item.textContent?.includes(answer));
      if (!button) throw new Error(`Could not find answer option: ${answer}`);
      fireEvent.click(button);
    };

    chooseAnswer(first!.question.answer);
    fireEvent.click(screen.getByRole("button", { name: /NEXT CIRCUIT/i }));
    expect(await screen.findByText(second!.question.prompt)).toBeInTheDocument();

    chooseAnswer(second!.question.answer);
    fireEvent.click(screen.getByRole("button", { name: /NEXT CIRCUIT/i }));
    await waitFor(() => {
      expect(screen.getByText(third!.question.prompt)).toBeInTheDocument();
      expect(screen.getByText(/LEVEL 2 · YOUR LEVEL 2/)).toBeInTheDocument();
    });
  });

  it("uses a same-concept remedial question after an incorrect mission answer", async () => {
    const first = getNextQuestionSelection(INITIAL_PROGRESS, "physics");
    expect(first).not.toBeNull();
    const remedialProgress = answerQuestion(
      INITIAL_PROGRESS,
      first!.question,
      first!.question.options.find((option) => option !== first!.question.answer)!,
    ).progress;
    const expectedRemedial = getNextQuestionSelection(
      remedialProgress,
      "physics",
      first!.question.id,
    );
    expect(expectedRemedial?.question.conceptId).toBe(first!.question.conceptId);

    const Mission = Route.options.component;
    if (!Mission) throw new Error("The home route has no mission component.");
    render(<Mission />);

    fireEvent.click(await screen.findByRole("button", { name: /LET'S GO/i }));
    expect(await screen.findByText(first!.question.prompt)).toBeInTheDocument();

    const wrongAnswer = first!.question.options.find(
      (option) => option !== first!.question.answer,
    )!;
    const wrongChoice = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes(wrongAnswer));
    if (!wrongChoice) throw new Error("Could not find an incorrect answer option.");
    fireEvent.click(wrongChoice);
    expect(
      await screen.findByText((content) => content.includes(first!.question.explanation)),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /SKIP CIRCUIT/i }));
    expect(await screen.findByText(expectedRemedial!.question.prompt)).toBeInTheDocument();
    expect(screen.getByText(/REMEDIAL/)).toBeInTheDocument();
  });

  it("does not claim a building is ready when its mastery requirement is still locked", async () => {
    const questionById = (id: string) => {
      const question = QUESTIONS.find((item) => item.id === id);
      if (!question) throw new Error(`Missing test question: ${id}`);
      return question;
    };
    const addition = questionById("addition-easy");
    const subtraction = questionById("arithmetic-subtraction-easy");
    const gardenArea = questionById("area-garden-easy");
    let progress: GameProgress = {
      ...INITIAL_PROGRESS,
      repair: 100,
      plotsUnlocked: 3,
      rewardEvents: ["mission-complete:power-station"],
      townBuildings: {
        ...INITIAL_PROGRESS.townBuildings,
        "power-station": {
          ...INITIAL_PROGRESS.townBuildings["power-station"],
          completed: true,
          status: "completed" as const,
        },
      },
    };

    for (const question of [addition, subtraction]) {
      progress = answerQuestion(
        progress,
        question,
        question.options.find((option) => option !== question.answer)!,
      ).progress;
    }
    progress = answerQuestion(progress, subtraction, subtraction.answer).progress;
    progress = answerQuestion(progress, gardenArea, gardenArea.answer).progress;
    expect(progress.rewardEvents.filter((event) => event.startsWith("reward:"))).toHaveLength(2);
    expect(progress.subjectStats.mathematics.mastery).toBeLessThan(60);
    const completingQuestion = getNextQuestionSelection(progress, "mathematics")?.question;
    if (!completingQuestion) throw new Error("Expected an unseen Maths question to complete the challenge.");

    window.localStorage.setItem("chase-town-progress-v1", JSON.stringify(progress));

    const Mission = Route.options.component;
    if (!Mission) throw new Error("The home route has no mission component.");
    render(<Mission />);
    fireEvent.click(await screen.findByRole("button", { name: /Open the Mathematics Academy challenge/i }));

    expect(await screen.findByText(completingQuestion.prompt)).toBeInTheDocument();
    const correctAnswer = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes(completingQuestion.answer));
    if (!correctAnswer) throw new Error("Could not find the final Maths answer option.");
    fireEvent.click(correctAnswer);

    expect(await screen.findByText(/MATHS CHALLENGE COMPLETE/i)).toBeInTheDocument();
    expect(await screen.findByText(/Continue practicing to meet the Research Lab construction requirements/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /VIEW BUILDING REQUIREMENTS/i })).toBeInTheDocument();
  });
});
