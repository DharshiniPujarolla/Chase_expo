import { describe, expect, it } from "vitest";

import {
  answerQuestion,
  buildWorkshop,
  completeMathsQuiz,
  completeSubjectQuiz,
  getCompletedSubjectQuestionCount,
  getNextQuestion,
  getNextQuestionSelection,
  getNextUnseenQuestion,
  getQuestionForRetry,
  getVisibleTownBuildings,
  INITIAL_PROGRESS,
  MATHS_QUIZ_COMPLETION_REWARD,
  MATHS_QUIZ_QUESTION_COUNT,
  purchaseBuilding,
  QUESTIONS,
  repairPowerStation,
  recordQuestionHint,
  restoreGameProgress,
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
    expect(getNextQuestion(streak, "physics")?.level).toBe(1);
    expect(getNextQuestion(streak, "physics")?.id).not.toBe(QUESTIONS[0]!.id);
  });
});

describe("CHASE saved progress restoration", () => {
  it("migrates an earlier save without losing town progress or crashing on new fields", () => {
    const restored = restoreGameProgress({
      coins: 85,
      xp: 60,
      wire: 2,
      repair: 100,
      level: 2,
      streak: 1,
      misses: 0,
      answered: ["current", "series"],
      builtWorkshop: true,
    });

    expect(restored).not.toBeNull();
    expect(restored?.coins).toBe(85);
    expect(restored?.builtWorkshop).toBe(true);
    expect(restored?.rewardEvents).toContain("reward:current");
    expect(getNextQuestion(restored!, "physics")).toBeDefined();
    expect(getVisibleTownBuildings(restored!).every((building) => typeof building.status === "string")).toBe(true);
    expect(getVisibleTownBuildings(restored!).find((building) => building.id === "workshop")?.status).toBe("completed");
    expect(getVisibleTownBuildings(restored!).find((building) => building.id === "power-station")?.status).toBe("completed");
  });

  it("rejects malformed saves instead of treating them as a valid progress object", () => {
    expect(restoreGameProgress({ coins: "many", answered: [] })).toBeNull();
  });

  it("preserves current save-schema subject stats and materials", () => {
    const currentSave = {
      ...INITIAL_PROGRESS,
      coins: 125,
      materials: 4,
      subjectStats: {
        ...INITIAL_PROGRESS.subjectStats,
        physics: {
          ...INITIAL_PROGRESS.subjectStats.physics,
          attempts: 3,
          correct: 2,
          incorrect: 1,
          mastery: 67,
          difficulty: 2,
        },
      },
    };

    const restored = restoreGameProgress(currentSave);

    expect(restored?.materials).toBe(4);
    expect(restored?.subjectStats.physics.mastery).toBe(67);
    expect(restored?.subjectStats.physics.difficulty).toBe(2);
  });

  it("migrates legacy concept labels into stable IDs without losing answer history", () => {
    const saved = {
      ...INITIAL_PROGRESS,
      subjectStats: {
        ...INITIAL_PROGRESS.subjectStats,
        physics: {
          ...INITIAL_PROGRESS.subjectStats.physics,
          attempts: 2,
          correct: 2,
          concepts: {
            "Ohm's law": {
              attempts: 2,
              correct: 2,
              incorrect: 0,
              difficulty: 2,
              recentPerformance: ["correct", "correct"],
              consecutiveCorrect: 2,
            },
          },
        },
      },
    };

    const restored = restoreGameProgress(saved);
    expect(restored?.subjectStats.physics.concepts["ohms_law"]?.correct).toBe(2);
    expect(restored?.subjectStats.physics.concepts["ohms_law"]?.difficultyStats[2].correct).toBe(2);
  });
});

describe("CHASE subject missions", () => {
  const mathsQuestions = QUESTIONS.filter((question) => question.subject === "mathematics");

  it("provides beginner, intermediate, and advanced questions with concept-specific hints", () => {
    expect(new Set(mathsQuestions.map((question) => question.level))).toEqual(new Set([1, 2, 3]));
    expect(mathsQuestions.length).toBeGreaterThanOrEqual(9);
    expect(mathsQuestions.every((question) => question.concept.length > 0 && question.hint.length > 0)).toBe(true);
    expect(mathsQuestions.filter((question) => question.level === 1).length).toBeGreaterThanOrEqual(3);
    expect(mathsQuestions.filter((question) => question.level === 2).length).toBeGreaterThanOrEqual(3);
    expect(mathsQuestions.filter((question) => question.level === 3).length).toBeGreaterThanOrEqual(3);
  });

  it("retries a missed question without rewards and advances to a different question", () => {
    const question = mathsQuestions[0]!;
    const incorrect = answerQuestion(INITIAL_PROGRESS, question, question.options[0]!);
    const retry = answerQuestion(incorrect.progress, question, question.answer);

    expect(incorrect.progress.coins).toBe(INITIAL_PROGRESS.coins);
    expect(incorrect.progress.xp).toBe(INITIAL_PROGRESS.xp);
    expect(incorrect.progress.materials).toBe(INITIAL_PROGRESS.materials);
    expect(retry.progress.coins).toBe(INITIAL_PROGRESS.coins + 25);
    expect(retry.progress.xp).toBe(INITIAL_PROGRESS.xp + 20);
    expect(retry.progress.materials).toBe(INITIAL_PROGRESS.materials + 1);
    expect(retry.progress.wire).toBe(INITIAL_PROGRESS.wire);
    expect(getNextUnseenQuestion(retry.progress, "mathematics")?.id).not.toBe(question.id);
  });

  it("adapts Maths difficulty upward after consistent success", () => {
    const easyQuestions = mathsQuestions.filter((question) => question.level === 1);
    const answered = easyQuestions.slice(0, 3).reduce((progress, question) => {
      return answerQuestion(progress, question, question.answer).progress;
    }, INITIAL_PROGRESS);

    expect(answered.subjectStats.mathematics.difficulty).toBe(2);
    expect(getNextUnseenQuestion(answered, "mathematics")?.level).toBeLessThanOrEqual(2);
  });

  it("grants one completion bonus and unlocks the Research Lab after Maths progress", () => {
    const completedQuestions = mathsQuestions.slice(0, MATHS_QUIZ_QUESTION_COUNT);
    const rewardedProgress = completedQuestions.reduce((progress, question) => {
      return answerQuestion(progress, question, question.answer).progress;
    }, INITIAL_PROGRESS);
    const completed = completeMathsQuiz(rewardedProgress);
    const repeatedCompletion = completeMathsQuiz(completed);

    expect(completed.coins).toBe(INITIAL_PROGRESS.coins + 25 * MATHS_QUIZ_QUESTION_COUNT + MATHS_QUIZ_COMPLETION_REWARD.coins);
    expect(completed.xp).toBe(20 * MATHS_QUIZ_QUESTION_COUNT + MATHS_QUIZ_COMPLETION_REWARD.xp);
    expect(completed.materials).toBe(MATHS_QUIZ_QUESTION_COUNT + MATHS_QUIZ_COMPLETION_REWARD.materials);
    expect(completed.rewardEvents).toContain("quiz-complete:mathematics");
    expect(repeatedCompletion).toEqual(completed);
    expect(getVisibleTownBuildings(completed).find((building) => building.id === "research-lab")?.status).toBe("available");

    const purchased = purchaseBuilding(completed, "research-lab");
    expect(purchased?.coins).toBe(completed.coins - 80);
    expect(purchased?.materials).toBe(completed.materials - 3);
    expect(purchased?.townBuildings["research-lab"].completed).toBe(true);
    expect(purchased?.builtWorkshop).toBe(false);
  });

  it("keeps the Research Lab locked until the full Maths challenge is complete", () => {
    const partialProgress = {
      ...INITIAL_PROGRESS,
      coins: 200,
      xp: 200,
      materials: 8,
      subjectStats: {
        ...INITIAL_PROGRESS.subjectStats,
        mathematics: {
          ...INITIAL_PROGRESS.subjectStats.mathematics,
          mastery: 100,
        },
      },
    };

    expect(getVisibleTownBuildings(partialProgress).find((building) => building.id === "research-lab")?.status)
      .toBe("locked");
    expect(purchaseBuilding(partialProgress, "research-lab")).toBeNull();
  });

  it("provides multi-level Chemistry and C++ questions with guided code tracing", () => {
    expect(new Set(QUESTIONS.map((question) => question.id)).size).toBe(QUESTIONS.length);

    for (const subject of ["chemistry", "computer-science"] as const) {
      const questions = QUESTIONS.filter((question) => question.subject === subject);
      expect(questions.length).toBeGreaterThanOrEqual(9);
      expect(new Set(questions.map((question) => question.level))).toEqual(new Set([1, 2, 3]));
      expect(questions.every((question) => question.concept && question.hint && question.explanation)).toBe(true);
      for (const level of [1, 2, 3]) {
        expect(questions.filter((question) => question.level === level).length).toBeGreaterThanOrEqual(3);
      }
    }

    const questionLevels = (subject: "chemistry" | "computer-science", concept: string) => {
      return new Set(
        QUESTIONS
          .filter((question) => question.subject === subject && question.concept === concept)
          .map((question) => question.level),
      );
    };
    for (const concept of ["Atoms", "Periodic table", "Chemical reactions", "Compounds", "Chemical bonding", "Balancing equations"]) {
      expect(questionLevels("chemistry", concept)).toEqual(new Set([1, 2, 3]));
    }
    for (const concept of ["Variables and data types", "Input and output", "Loops", "Arrays"]) {
      expect(questionLevels("computer-science", concept)).toEqual(new Set([1, 2, 3]));
    }

    const inputQuestion = QUESTIONS.find((question) => question.id === "cpp-input")!;
    expect(inputQuestion.prompt).toContain("std::cin >> age;");
    expect(inputQuestion.answer).toContain("Reads a value");

    const sumTrace = QUESTIONS.find((question) => question.id === "cpp-for-sum")!;
    expect(sumTrace.prompt).toContain("cout << sum;");
    expect(sumTrace.answer).toBe("6");
    expect(sumTrace.explanation).toContain("1 + 2 + 3");
  });

  it("evaluates a missed Chemistry answer and awards its corrected answer only once", () => {
    const question = QUESTIONS.find((item) => item.id === "atom-electron")!;
    const incorrect = answerQuestion(INITIAL_PROGRESS, question, question.options[0]!);
    expect(incorrect.correct).toBe(false);
    expect(incorrect.progress.coins).toBe(INITIAL_PROGRESS.coins);

    const corrected = answerQuestion(incorrect.progress, question, question.answer);
    const repeated = answerQuestion(corrected.progress, question, question.answer);
    expect(corrected.correct).toBe(true);
    expect(corrected.progress.coins).toBe(INITIAL_PROGRESS.coins + 25);
    expect(repeated.reward).toBe(0);
    expect(repeated.progress.coins).toBe(corrected.progress.coins);
    expect(repeated.progress.subjectStats.chemistry.mastery).toBe(23);
    expect(repeated.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.correct).toBe(0);
    expect(repeated.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.retryAttempts).toBe(2);
  });

  it("starts new concepts at easy and chooses the next question from the shared adaptive selector", () => {
    const first = getNextQuestionSelection(INITIAL_PROGRESS, "physics");
    expect(first?.question.level).toBe(1);
    expect(first?.question.concept).toBe("Ohm's law");
    expect(first?.mode).toBe("new");

    const answered = answerQuestion(INITIAL_PROGRESS, first!.question, first!.question.answer).progress;
    const next = getNextQuestionSelection(answered, "physics", first!.question.id);
    expect(next?.question.concept).toBe(first?.question.concept);
    expect(next?.question.level).toBe(1);
    expect(next?.question.id).not.toBe(first?.question.id);
  });

  it("uses stable concept IDs and keeps Chemistry symbol knowledge separate from particle-charge mastery", () => {
    const symbolQuestion = QUESTIONS.find((question) => question.id === "periodic-symbol-oxygen")!;
    const particleQuestion = QUESTIONS.find((question) => question.id === "atom-layout")!;
    const answered = answerQuestion(INITIAL_PROGRESS, symbolQuestion, symbolQuestion.answer).progress;

    expect(symbolQuestion.conceptId).toBe("chemical_symbols");
    expect(particleQuestion.conceptId).toBe("subatomic_particles");
    expect(answered.subjectStats.chemistry.concepts["chemical_symbols"]?.correct).toBe(1);
    expect(answered.subjectStats.chemistry.concepts["subatomic_particles"]).toBeUndefined();
    expect(symbolQuestion.difficulty).toBe("easy");
  });

  it("keeps a missed chemistry charge question on that concept and steps back to easier practice", () => {
    const particleQuestion = QUESTIONS.find((question) => question.id === "atom-layout")!;
    const missed = answerQuestion(
      INITIAL_PROGRESS,
      particleQuestion,
      particleQuestion.options.find((option) => option !== particleQuestion.answer)!,
    );
    const remedial = getNextQuestionSelection(
      missed.progress,
      "chemistry",
      particleQuestion.id,
    );

    expect(remedial?.mode).toBe("remedial");
    expect(remedial?.question.conceptId).toBe("subatomic_particles");
    expect(remedial?.question.id).not.toBe(particleQuestion.id);
    expect(remedial?.question.level).toBeLessThanOrEqual(particleQuestion.level);

    const recovered = answerQuestion(
      missed.progress,
      remedial!.question,
      remedial!.question.answer,
      { remedial: true },
    ).progress;
    const next = getNextQuestionSelection(recovered, "chemistry", remedial!.question.id);
    expect(recovered.subjectStats.chemistry.concepts["subatomic_particles"]?.correct).toBe(1);
    expect(next?.question.conceptId).toBe("subatomic_particles");
  });

  it("uses a related prerequisite after repeated Algebra errors instead of jumping to another Maths topic", () => {
    const difficultQuestion = QUESTIONS.find((question) => question.id === "equation-medium-brackets")!;
    const wrongOption = difficultQuestion.options.find((option) => option !== difficultQuestion.answer)!;
    const firstMiss = answerQuestion(INITIAL_PROGRESS, difficultQuestion, wrongOption);
    const easier = getNextQuestionSelection(
      firstMiss.progress,
      "mathematics",
      difficultQuestion.id,
    );
    expect(easier?.question.conceptId).toBe("linear_equations");
    expect(easier?.question.level).toBeLessThan(difficultQuestion.level);

    const secondMiss = answerQuestion(firstMiss.progress, easier!.question, wrongOption);
    const prerequisite = getNextQuestionSelection(
      secondMiss.progress,
      "mathematics",
      easier!.question.id,
    );
    expect(prerequisite?.mode).toBe("remedial");
    expect(prerequisite?.question.conceptId).toBe("arithmetic");
  });

  it("provides multiple unique questions at every difficulty for key adaptive concepts", () => {
    const concepts = ["linear_equations", "ohms_law", "subatomic_particles"];
    for (const conceptId of concepts) {
      const questions = QUESTIONS.filter((question) => question.conceptId === conceptId);
      for (const difficulty of ["easy", "medium", "hard"] as const) {
        const atDifficulty = questions.filter((question) => question.difficulty === difficulty);
        expect(atDifficulty.length, `${conceptId} ${difficulty}`).toBeGreaterThanOrEqual(2);
        expect(new Set(atDifficulty.map((question) => question.id)).size).toBe(atDifficulty.length);
      }
    }
  });

  it("validates question keys, choices, stable concepts, difficulty and prerequisite references", () => {
    expect(new Set(QUESTIONS.map((question) => question.id)).size).toBe(QUESTIONS.length);
    for (const question of QUESTIONS) {
      expect(question.conceptId).toMatch(/^[a-z0-9_]+$/);
      expect(question.options).toContain(question.answer);
      expect(question.explanation.length).toBeGreaterThan(0);
      expect(question.hint.length).toBeGreaterThan(0);
      expect(question.difficulty).toBe(
        question.level === 1 ? "easy" : question.level === 2 ? "medium" : "hard",
      );
      for (const prerequisite of question.prerequisiteConceptIds ?? []) {
        expect(
          QUESTIONS.some((candidate) =>
            candidate.subject === question.subject && candidate.conceptId === prerequisite,
          ),
        ).toBe(true);
      }
    }
  });

  it("has alternative questions at every difficulty currently represented in the bank", () => {
    const counts = new Map<string, number>();
    for (const question of QUESTIONS) {
      const key = `${question.subject}:${question.conceptId}:${question.difficulty}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of counts) {
      expect(count, key).toBeGreaterThanOrEqual(2);
    }
  });

  it("does not offer a question already displayed in the active challenge", () => {
    const first = getNextQuestionSelection(INITIAL_PROGRESS, "physics");
    const afterFirst = answerQuestion(
      INITIAL_PROGRESS,
      first!.question,
      first!.question.answer,
    ).progress;
    const next = getNextQuestionSelection(
      afterFirst,
      "physics",
      first!.question.id,
      [first!.question.id, "ohms-law-easy-current"],
    );

    expect(next?.question.id).not.toBe(first?.question.id);
    expect(next?.question.id).not.toBe("ohms-law-easy-current");
  });

  it("raises difficulty only after two clean answers at each level and supplies harder questions in every subject", () => {
    const ladders = [
      ["physics", "Ohm's law"],
      ["mathematics", "Linear equations"],
      ["chemistry", "Atoms"],
      ["computer-science", "Loops"],
    ] as const;

    for (const [subject, concept] of ladders) {
      const otherQuestions = QUESTIONS
        .filter((question) => question.subject === subject && question.concept !== concept)
        .map((question) => question.id);
      let progress = { ...INITIAL_PROGRESS, answered: otherQuestions };

      for (const expectedLevel of [1, 1, 2, 2, 3]) {
        const selection = getNextQuestionSelection(progress, subject);
        expect(selection?.question.concept).toBe(concept);
        expect(selection?.question.level).toBe(expectedLevel);
        if (expectedLevel === 3) break;
        progress = answerQuestion(
          progress,
          selection!.question,
          selection!.question.answer,
        ).progress;
      }
    }
  });

  it("lowers concept difficulty after an error and selects a different easier remedial question", () => {
    const subject = "chemistry";
    const targetQuestions = QUESTIONS
      .filter((question) => question.subject === subject && question.concept !== "Atoms")
      .map((question) => question.id);
    let progress = { ...INITIAL_PROGRESS, answered: targetQuestions };

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const selection = getNextQuestionSelection(progress, subject);
      expect(selection?.question.level).toBe(1);
      progress = answerQuestion(progress, selection!.question, selection!.question.answer).progress;
    }
    const difficultQuestion = getNextQuestionSelection(progress, subject)!.question;
    expect(difficultQuestion.level).toBe(2);
    const missed = answerQuestion(
      progress,
      difficultQuestion,
      difficultQuestion.options.find((option) => option !== difficultQuestion.answer)!,
    );
    expect(missed.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.difficulty).toBe(1);
    expect(missed.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.needsRemedial).toBe(true);

    const remedial = getNextQuestionSelection(missed.progress, subject, difficultQuestion.id);
    expect(remedial?.mode).toBe("remedial");
    expect(remedial?.question.concept).toBe("Atoms");
    expect(remedial?.question.level).toBeLessThan(difficultQuestion.level);
    expect(remedial?.question.id).not.toBe(difficultQuestion.id);
  });

  it("keeps difficulty and mastery independent between concepts in the same subject", () => {
    let progress = INITIAL_PROGRESS;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const question = getNextQuestionSelection(progress, "physics")!.question;
      progress = answerQuestion(progress, question, question.answer).progress;
    }
    expect(progress.subjectStats.physics.concepts["ohms_law"]?.difficulty).toBe(2);

    const seriesQuestion = QUESTIONS.find((question) => question.id === "series")!;
    progress = answerQuestion(
      progress,
      seriesQuestion,
      seriesQuestion.options.find((option) => option !== seriesQuestion.answer)!,
    ).progress;
    expect(progress.subjectStats.physics.concepts["ohms_law"]?.difficulty).toBe(2);
    expect(progress.subjectStats.physics.concepts["series_circuits"]?.difficulty).toBe(1);
    expect(progress.subjectStats.physics.concepts["series_circuits"]?.mastery).toBeLessThan(50);
  });

  it("recovers from repeated mistakes with different remedial questions, then advances again", () => {
    const subject = "physics";
    const otherQuestions = QUESTIONS
      .filter((question) => question.subject === subject && question.concept !== "Ohm's law")
      .map((question) => question.id);
    let progress = { ...INITIAL_PROGRESS, answered: otherQuestions };

    for (let failure = 0; failure < 2; failure += 1) {
      const selection = getNextQuestionSelection(progress, subject);
      expect(selection?.question.level).toBe(1);
      progress = answerQuestion(
        progress,
        selection!.question,
        selection!.question.options[0]!,
        { remedial: selection!.mode === "remedial" },
      ).progress;
      expect(getNextQuestionSelection(progress, subject, selection!.question.id)?.mode).toBe("remedial");
    }

    const recoveryQuestion = getNextQuestionSelection(progress, subject)!;
    progress = answerQuestion(progress, recoveryQuestion.question, recoveryQuestion.question.answer, {
      remedial: true,
    }).progress;
    const secondRecoveryQuestion = getNextQuestionSelection(progress, subject)!;
    progress = answerQuestion(
      progress,
      secondRecoveryQuestion.question,
      secondRecoveryQuestion.question.answer,
    ).progress;
    expect(progress.subjectStats.physics.concepts["ohms_law"]?.difficulty).toBe(2);

    for (let success = 0; success < 2; success += 1) {
      const selection = getNextQuestionSelection(progress, subject)!;
      expect(selection.question.level).toBe(2);
      progress = answerQuestion(progress, selection.question, selection.question.answer).progress;
    }
    expect(getNextQuestionSelection(progress, subject)?.question.level).toBe(3);
  });

  it("never repeats an answered question automatically and reports a safely exhausted bank", () => {
    const subject = "mathematics";
    const subjectQuestions = QUESTIONS.filter((question) => question.subject === subject);
    let progress = INITIAL_PROGRESS;
    let previousQuestionId: string | undefined;

    for (const question of subjectQuestions) {
      const selection = getNextQuestionSelection(progress, subject, previousQuestionId);
      if (!selection) break;
      expect(selection.question.id).not.toBe(previousQuestionId);
      progress = answerQuestion(progress, selection.question, selection.question.options[0]!).progress;
      previousQuestionId = selection.question.id;
    }
    progress = { ...progress, answered: subjectQuestions.map((question) => question.id) };

    expect(getNextQuestionSelection(progress, subject)).toBeNull();
    expect(getNextUnseenQuestion(progress, subject)).toBeNull();
    expect(getQuestionForRetry(progress, subject)).not.toBeNull();
  });

  it("does not treat retries or hints as clean mastery evidence or pay a question twice", () => {
    const question = QUESTIONS.find((item) => item.id === "atom-layout")!;
    const missed = answerQuestion(INITIAL_PROGRESS, question, question.options[0]!);
    const masteryAfterMiss = missed.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.mastery;
    const withHint = recordQuestionHint(missed.progress, question);
    const retried = answerQuestion(withHint, question, question.answer, { retry: true });
    const repeated = answerQuestion(retried.progress, question, question.answer, { retry: true });

    expect(withHint.subjectStats.chemistry.concepts["subatomic_particles"]?.hints).toBe(1);
    expect(retried.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.attempts).toBe(1);
    expect(retried.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.correct).toBe(0);
    expect(retried.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.mastery).toBe(masteryAfterMiss);
    expect(retried.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.retryAttempts).toBe(1);
    expect(retried.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.questionAttempts[question.id]).toBe(2);
    expect(retried.reward).toBe(25);
    expect(repeated.reward).toBe(0);
    expect(repeated.progress.coins).toBe(retried.progress.coins);
    expect(repeated.progress.xp).toBe(retried.progress.xp);
    expect(repeated.progress.materials).toBe(retried.progress.materials);
    expect(repeated.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.correct).toBe(0);
    expect(repeated.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.attempts).toBe(1);
    expect(repeated.progress.subjectStats.chemistry.concepts["subatomic_particles"]?.questionAttempts[question.id]).toBe(3);
    expect(completeSubjectQuiz(repeated.progress, "chemistry").rewardEvents)
      .not.toContain("quiz-complete:chemistry");
  });

  it("preserves per-question attempt counts and safely defaults them for older saves", () => {
    const question = QUESTIONS.find((item) => item.id === "atom-layout")!;
    const attempted = answerQuestion(INITIAL_PROGRESS, question, question.options[0]!).progress;
    const restored = restoreGameProgress(attempted);
    expect(
      restored?.subjectStats.chemistry.concepts["subatomic_particles"]?.questionAttempts[question.id],
    ).toBe(1);

    const olderSave = {
      ...attempted,
      subjectStats: {
        ...attempted.subjectStats,
        chemistry: {
          ...attempted.subjectStats.chemistry,
          concepts: {
            subatomic_particles: {
              ...attempted.subjectStats.chemistry.concepts["subatomic_particles"],
              questionAttempts: undefined,
            },
          },
        },
      },
    };
    const migrated = restoreGameProgress(olderSave);
    expect(migrated?.subjectStats.chemistry.concepts["subatomic_particles"]?.questionAttempts).toEqual({});
    expect(migrated?.subjectStats.chemistry.concepts["subatomic_particles"]?.attempts).toBe(1);
  });

  it("keeps smoothed concept mastery bounded and below mastery after one correct response", () => {
    const question = QUESTIONS.find((item) => item.id === "current")!;
    const firstCorrect = answerQuestion(INITIAL_PROGRESS, question, question.answer);
    const mastery = firstCorrect.progress.subjectStats.physics.concepts["ohms_law"]!.mastery;
    expect(mastery).toBeGreaterThan(0);
    expect(mastery).toBeLessThan(100);

    let progress = firstCorrect.progress;
    for (const result of ["incorrect", "correct", "correct", "correct", "correct"] as const) {
      const conceptStats = progress.subjectStats.physics.concepts["ohms_law"]!;
      const unseenQuestion = QUESTIONS.find(
        (candidate) =>
          candidate.subject === "physics" &&
          candidate.concept === "Ohm's law" &&
          !progress.answered.includes(candidate.id),
      )!;
      progress = answerQuestion(
        progress,
        unseenQuestion,
        result === "correct" ? unseenQuestion.answer : unseenQuestion.options[0]!,
      ).progress;
      expect(progress.subjectStats.physics.concepts["ohms_law"]!.mastery).toBeGreaterThanOrEqual(0);
      expect(progress.subjectStats.physics.concepts["ohms_law"]!.mastery).toBeLessThanOrEqual(100);
      expect(conceptStats.mastery).toBeGreaterThanOrEqual(0);
    }
    const subject = progress.subjectStats.physics;
    const evidence = subject.concepts["ohms_law"]!.correct + subject.concepts["ohms_law"]!.incorrect;
    expect(subject.mastery).toBe(subject.concepts["ohms_law"]!.mastery);
    expect(evidence).toBe(subject.attempts);
  });

  it("keeps chemistry and coding quiz completion and building unlocks independent", () => {
    const answerChallenge = (starting: typeof INITIAL_PROGRESS, subject: "chemistry" | "computer-science") => {
      let next = starting;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const question = getNextUnseenQuestion(next, subject);
        expect(question).not.toBeNull();
        next = answerQuestion(next, question!, question!.answer).progress;
        next = completeSubjectQuiz(next, subject);
      }
      return next;
    };

    const physicsProgress = (() => {
      let next = INITIAL_PROGRESS;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const question = getNextQuestion(next, "physics");
        expect(question).not.toBeNull();
        next = answerQuestion(next, question!, question!.answer).progress;
      }
      return repairPowerStation(next)!;
    })();
    const mathsProgress = (() => {
      let next = physicsProgress;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const question = getNextUnseenQuestion(next, "mathematics")!;
        next = answerQuestion(next, question, question.answer).progress;
        next = completeMathsQuiz(next);
      }
      return next;
    })();
    const withResearchLab = purchaseBuilding(mathsProgress, "research-lab")!;
    expect(getVisibleTownBuildings(withResearchLab).find((building) => building.id === "chemical-lab")?.status).toBe("locked");

    const chemistryComplete = answerChallenge(withResearchLab, "chemistry");
    expect(chemistryComplete.rewardEvents).toContain("quiz-complete:chemistry");
    expect(getCompletedSubjectQuestionCount(chemistryComplete, "chemistry")).toBe(3);
    expect(getVisibleTownBuildings(chemistryComplete).find((building) => building.id === "chemical-lab")?.status).toBe("available");
    expect(getVisibleTownBuildings(chemistryComplete).find((building) => building.id === "coding-workshop")?.status).toBe("locked");
    expect(completeSubjectQuiz(chemistryComplete, "chemistry")).toEqual(chemistryComplete);

    const withChemicalLab = purchaseBuilding(chemistryComplete, "chemical-lab")!;
    expect(withChemicalLab.townBuildings["chemical-lab"].completed).toBe(true);
    expect(withChemicalLab.plotsUnlocked).toBe(chemistryComplete.plotsUnlocked + 1);
    const codingComplete = answerChallenge(withChemicalLab, "computer-science");
    expect(codingComplete.rewardEvents).toContain("quiz-complete:computer-science");
    expect(codingComplete.rewardEvents).toContain("quiz-complete:chemistry");
    expect(codingComplete.coins).toBe(withChemicalLab.coins + 3 * 25 + 35);
    expect(getVisibleTownBuildings(codingComplete).find((building) => building.id === "coding-workshop")?.status).toBe("available");

    const withCodingStudio = purchaseBuilding(codingComplete, "coding-workshop")!;
    expect(withCodingStudio.townBuildings["coding-workshop"].completed).toBe(true);
    expect(withCodingStudio.plotsUnlocked).toBe(codingComplete.plotsUnlocked + 1);
    expect(purchaseBuilding(withCodingStudio, "coding-workshop")).toBeNull();
  });

  it("does not pay twice for a previously rewarded Maths question", () => {
    const question = mathsQuestions[0]!;
    const rewarded = answerQuestion(INITIAL_PROGRESS, question, question.answer).progress;
    const repeated = answerQuestion(rewarded, question, question.answer);

    expect(repeated.reward).toBe(0);
    expect(repeated.progress.coins).toBe(rewarded.coins);
    expect(repeated.progress.xp).toBe(rewarded.xp);
    expect(repeated.progress.materials).toBe(rewarded.materials);
  });

  it("completes the Physics station once, advances a level, and opens the next plot", () => {
    const repaired = repairPowerStation({
      ...INITIAL_PROGRESS,
      coins: 110,
      xp: 80,
      repair: 100,
      materials: 4,
    });

    expect(repaired?.coins).toBe(170);
    expect(repaired?.xp).toBe(120);
    expect(repaired?.level).toBe(2);
    expect(repaired?.materials).toBe(7);
    expect(repaired?.plotsUnlocked).toBe(INITIAL_PROGRESS.plotsUnlocked + 1);
    expect(repaired?.rewardEvents).toContain("mission-complete:power-station");
    expect(repairPowerStation(repaired!)).toBeNull();
    expect(purchaseBuilding(INITIAL_PROGRESS, "power-station")).toBeNull();
  });

  it("moves Physics to a harder unseen circuit question after mastering the easy set", () => {
    let progress = INITIAL_PROGRESS;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const current = getNextQuestion(progress, "physics");
      expect(current).not.toBeNull();
      progress = answerQuestion(progress, current!, current!.answer).progress;
    }

    const next = getNextQuestion(progress, "physics");
    expect(next?.concept).toBe("Ohm's law");
    expect(next?.level).toBe(2);
    expect(progress.answered).not.toContain(next?.id);
  });

  it("finishes the Physics repair with four distinct correct questions and pays once", () => {
    let repaired = INITIAL_PROGRESS;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const question = getNextQuestion(repaired, "physics");
      expect(question).not.toBeNull();
      repaired = answerQuestion(repaired, question!, question!.answer).progress;
    }
    const completed = repairPowerStation(repaired);

    expect(repaired.repair).toBe(100);
    expect(new Set(repaired.answered.filter((id) => QUESTIONS.find((question) => question.id === id)?.subject === "physics")).size)
      .toBe(4);
    expect(completed?.rewardEvents).toContain("mission-complete:power-station");
    expect(repairPowerStation(completed!)).toBeNull();
  });
});