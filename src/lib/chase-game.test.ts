import { describe, expect, it } from "vitest";

import {
  answerQuestion,
  buildWorkshop,
  getNextQuestion,
  INITIAL_PROGRESS,
  QUESTIONS,
  WORKSHOP_COST,
} from "@/lib/chase-game";

describe("CHASE town-building rewards", () => {
  it("awards 25 coins, 20 XP, one wire, and 25 repair for a correct answer", () => {
    const result = answerQuestion(INITIAL_PROGRESS, QUESTIONS[0]!, QUESTIONS[0]!.answer);

    expect(result.progress.coins).toBe(55);
    expect(result.progress.xp).toBe(20);
    expect(result.progress.wire).toBe(1);
    expect(result.progress.repair).toBe(25);
    expect(result.reward).toBe(25);
  });

  it("awards no rewards for a wrong answer and records the miss", () => {
    const result = answerQuestion(INITIAL_PROGRESS, QUESTIONS[0]!, QUESTIONS[0]!.options[0]!);

    expect(result.correct).toBe(false);
    expect(result.reward).toBe(0);
    expect(result.progress.coins).toBe(INITIAL_PROGRESS.coins);
    expect(result.progress.repair).toBe(0);
    expect(result.progress.misses).toBe(1);
  });

  it("spends 50 coins exactly once to build the workshop", () => {
    const purchased = buildWorkshop({ ...INITIAL_PROGRESS, coins: WORKSHOP_COST });

    expect(purchased?.coins).toBe(0);
    expect(purchased?.builtWorkshop).toBe(true);
    expect(buildWorkshop(purchased!)).toBeNull();
    expect(buildWorkshop({ ...INITIAL_PROGRESS, coins: WORKSHOP_COST - 1 })).toBeNull();
  });

  it("adapts upward after a streak and rotates away from the previous question", () => {
    const streak = answerQuestion(
      { ...INITIAL_PROGRESS, streak: 1 },
      QUESTIONS[0]!,
      QUESTIONS[0]!.answer,
    ).progress;

    expect(streak.level).toBe(2);
    expect(getNextQuestion(streak).level).toBe(1);
    expect(getNextQuestion(streak).id).not.toBe(QUESTIONS[0]!.id);
  });
});