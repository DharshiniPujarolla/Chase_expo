export type Subject = "physics" | "mathematics" | "chemistry" | "computer-science";
export type BuildingStatus = "locked" | "available" | "under_construction" | "completed";
export type BuildingId =
  | "power-station"
  | "workshop"
  | "research-lab"
  | "math-centre"
  | "chemical-lab"
  | "coding-workshop";

export type ConceptAnswerResult = "correct" | "incorrect" | "retry";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type ConceptDifficultyStats = {
  attempted: number;
  correct: number;
  incorrect: number;
};
export type ConceptStats = {
  attempts: number;
  correct: number;
  incorrect: number;
  struggles: number;
  recentPerformance: ConceptAnswerResult[];
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  mastery: number;
  difficulty: number;
  difficultyStats: Record<1 | 2 | 3, ConceptDifficultyStats>;
  mastered: boolean;
  hints: number;
  remedialAttempts: number;
  retryAttempts: number;
  questionAttempts: Record<string, number>;
  needsRemedial: boolean;
  lastQuestionId: string | null;
  lastQuestionLevel: number;
};

export type SubjectStats = {
  attempts: number;
  correct: number;
  incorrect: number;
  mastery: number;
  difficulty: number;
  concepts: Record<string, ConceptStats>;
};

export type GameProgress = {
  coins: number;
  xp: number;
  wire: number;
  repair: number;
  level: number;
  streak: number;
  misses: number;
  answered: string[];
  builtWorkshop: boolean;
  materials: number;
  rewardEvents: string[];
  subjectStats: Record<Subject, SubjectStats>;
  townBuildings: Record<BuildingId, { status: BuildingStatus; cost: number; materials: number; completed: boolean }>;
  plotsUnlocked: number;
};

export type PhysicsQuestion = {
  id: string;
  level: number;
  difficulty: QuestionDifficulty;
  subject: Subject;
  conceptId: string;
  concept: string;
  prompt: string;
  options: string[];
  answer: string;
  hint: string;
  explanation: string;
  prerequisiteConcepts?: string[];
  prerequisiteConceptIds?: string[];
};

type QuestionSeed = Omit<PhysicsQuestion, "difficulty" | "conceptId" | "prerequisiteConceptIds">;

export const WORKSHOP_COST = 50;
const LEGACY_CONCEPT_KEY = "__legacy_unattributed__";
const RECENT_PERFORMANCE_LIMIT = 5;

export const BUILDING_DEFINITIONS: Record<
  BuildingId,
  {
    name: string;
    subject: Subject;
    cost: number;
    materials: number;
    requirements: {
      coins?: number;
      xp?: number;
      repair?: number;
      materials?: number;
      buildingIds?: BuildingId[];
      subject?: Subject;
      mastery?: number;
      rewardEvent?: string;
    };
    reward: { coins: number; xp: number; materials: number };
  }
> = {
  "power-station": {
    name: "Power Station",
    subject: "physics",
    cost: 0,
    materials: 0,
    requirements: { repair: 0 },
    reward: { coins: 60, xp: 40, materials: 3 },
  },
  workshop: {
    name: "Workshop",
    subject: "physics",
    cost: WORKSHOP_COST,
    materials: 0,
    requirements: { coins: WORKSHOP_COST, xp: 20 },
    reward: { coins: 40, xp: 25, materials: 2 },
  },
  "research-lab": {
    name: "Research Lab",
    subject: "chemistry",
    cost: 80,
    materials: 3,
    requirements: {
      coins: 80,
      xp: 80,
      mastery: 60,
      subject: "mathematics",
      rewardEvent: "quiz-complete:mathematics",
    },
    reward: { coins: 60, xp: 45, materials: 4 },
  },
  "chemical-lab": {
    name: "Chemical Laboratory",
    subject: "chemistry",
    cost: 130,
    materials: 5,
    requirements: {
      coins: 130,
      xp: 300,
      materials: 5,
      buildingIds: ["research-lab"],
      mastery: 60,
      subject: "chemistry",
      rewardEvent: "quiz-complete:chemistry",
    },
    reward: { coins: 90, xp: 55, materials: 4 },
  },
  "math-centre": {
    name: "Mathematics Academy",
    subject: "mathematics",
    cost: 100,
    materials: 4,
    requirements: {
      coins: 100,
      xp: 80,
      buildingIds: ["power-station"],
      mastery: 60,
      subject: "mathematics",
      rewardEvent: "quiz-complete:mathematics",
    },
    reward: { coins: 75, xp: 60, materials: 5 },
  },
  "coding-workshop": {
    name: "Coding Studio",
    subject: "computer-science",
    cost: 180,
    materials: 6,
    requirements: {
      coins: 180,
      xp: 350,
      materials: 6,
      buildingIds: ["chemical-lab"],
      mastery: 60,
      subject: "computer-science",
      rewardEvent: "quiz-complete:computer-science",
    },
    reward: { coins: 90, xp: 70, materials: 6 },
  },
};

const DEFAULT_SUBJECT_STATS = (): SubjectStats => ({
  attempts: 0,
  correct: 0,
  incorrect: 0,
  mastery: 0,
  difficulty: 1,
  concepts: {},
});

export const INITIAL_PROGRESS: GameProgress = {
  coins: 30,
  xp: 0,
  wire: 0,
  repair: 0,
  level: 1,
  streak: 0,
  misses: 0,
  answered: [],
  builtWorkshop: false,
  materials: 0,
  rewardEvents: [],
  subjectStats: {
    physics: DEFAULT_SUBJECT_STATS(),
    mathematics: DEFAULT_SUBJECT_STATS(),
    chemistry: DEFAULT_SUBJECT_STATS(),
    "computer-science": DEFAULT_SUBJECT_STATS(),
  },
  townBuildings: {
    "power-station": { status: "available", cost: 0, materials: 0, completed: false },
    workshop: { status: "locked", cost: WORKSHOP_COST, materials: 0, completed: false },
    "research-lab": { status: "locked", cost: 80, materials: 3, completed: false },
    "math-centre": { status: "locked", cost: 100, materials: 4, completed: false },
    "chemical-lab": { status: "locked", cost: 130, materials: 5, completed: false },
    "coding-workshop": { status: "locked", cost: 180, materials: 6, completed: false },
  },
  plotsUnlocked: 2,
};

const SUBJECTS: Subject[] = ["physics", "mathematics", "chemistry", "computer-science"];
const BUILDING_IDS: BuildingId[] = [
  "power-station",
  "workshop",
  "research-lab",
  "math-centre",
  "chemical-lab",
  "coding-workshop",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampDifficulty(level: number): number {
  return Math.min(3, Math.max(1, Math.floor(level)));
}

function calculateConceptMastery(
  correct: number,
  incorrect: number,
  recentPerformance: ConceptAnswerResult[],
): number {
  const cleanAttempts = correct + incorrect;
  if (cleanAttempts === 0) return 0;

  const smoothedAccuracy = (correct + 1) / (cleanAttempts + 2);
  const recentResults = recentPerformance.filter(
    (result): result is "correct" | "incorrect" => result !== "retry",
  );
  if (recentResults.length === 0) return Math.round(smoothedAccuracy * 100);

  const recentAccuracy =
    recentResults.filter((result) => result === "correct").length / recentResults.length;
  return Math.max(
    0,
    Math.min(100, Math.round((smoothedAccuracy * 0.7 + recentAccuracy * 0.3) * 100)),
  );
}

function normalizeConceptStats(value: unknown): ConceptStats | null {
  if (!isRecord(value)) return null;

  const rawAttempts = isFiniteNumber(value.attempts) ? Math.max(0, Math.floor(value.attempts)) : 0;
  const correct = isFiniteNumber(value.correct)
    ? Math.max(0, Math.floor(value.correct))
    : 0;
  const incorrect = isFiniteNumber(value.incorrect)
    ? Math.max(0, Math.floor(value.incorrect))
    : Math.max(0, rawAttempts - correct);
  const attempts = Math.max(rawAttempts, correct + incorrect);
  const recentPerformance = Array.isArray(value.recentPerformance)
    ? value.recentPerformance
      .filter((result): result is ConceptAnswerResult =>
        result === "correct" || result === "incorrect" || result === "retry",
      )
      .slice(-RECENT_PERFORMANCE_LIMIT)
    : [];
  const hasDifficultyStats = isRecord(value.difficultyStats);
  const savedDifficulty = isFiniteNumber(value.difficulty) ? clampDifficulty(value.difficulty) : 1;
  const difficultyStats = {
    1: normalizeDifficultyStats(isRecord(value.difficultyStats) ? value.difficultyStats["1"] : undefined),
    2: normalizeDifficultyStats(isRecord(value.difficultyStats) ? value.difficultyStats["2"] : undefined),
    3: normalizeDifficultyStats(isRecord(value.difficultyStats) ? value.difficultyStats["3"] : undefined),
  };
  if (!hasDifficultyStats) {
    difficultyStats[savedDifficulty as 1 | 2 | 3] = { attempted: attempts, correct, incorrect };
  }
  const consecutiveCorrect = isFiniteNumber(value.consecutiveCorrect)
    ? Math.max(0, Math.floor(value.consecutiveCorrect))
    : 0;
  const consecutiveIncorrect = isFiniteNumber(value.consecutiveIncorrect)
    ? Math.max(0, Math.floor(value.consecutiveIncorrect))
    : 0;
  const mastery = calculateConceptMastery(correct, incorrect, recentPerformance);
  const questionAttempts = isRecord(value.questionAttempts)
    ? Object.fromEntries(
      Object.entries(value.questionAttempts).flatMap(([questionId, count]) =>
        isFiniteNumber(count) && Number.isInteger(count) && count > 0
          ? [[questionId, count]]
          : [],
      ),
    )
    : {};

  return {
    attempts,
    correct,
    incorrect,
    struggles: isFiniteNumber(value.struggles)
      ? Math.max(0, Math.floor(value.struggles))
      : incorrect,
    recentPerformance,
    consecutiveCorrect,
    consecutiveIncorrect,
    mastery,
    difficulty: savedDifficulty,
    difficultyStats,
    mastered: correct >= 4 && mastery >= 80 && consecutiveIncorrect === 0,
    hints: isFiniteNumber(value.hints) ? Math.max(0, Math.floor(value.hints)) : 0,
    remedialAttempts: isFiniteNumber(value.remedialAttempts)
      ? Math.max(0, Math.floor(value.remedialAttempts))
      : 0,
    retryAttempts: isFiniteNumber(value.retryAttempts)
      ? Math.max(0, Math.floor(value.retryAttempts))
      : 0,
    questionAttempts,
    needsRemedial: value.needsRemedial === true,
    lastQuestionId: typeof value.lastQuestionId === "string" ? value.lastQuestionId : null,
    lastQuestionLevel: isFiniteNumber(value.lastQuestionLevel)
      ? clampDifficulty(value.lastQuestionLevel)
      : 1,
  };
}

function normalizeDifficultyStats(value: unknown): ConceptDifficultyStats {
  if (!isRecord(value)) return { attempted: 0, correct: 0, incorrect: 0 };
  return {
    attempted: isFiniteNumber(value.attempted) ? Math.max(0, Math.floor(value.attempted)) : 0,
    correct: isFiniteNumber(value.correct) ? Math.max(0, Math.floor(value.correct)) : 0,
    incorrect: isFiniteNumber(value.incorrect) ? Math.max(0, Math.floor(value.incorrect)) : 0,
  };
}

function summarizeSubjectConcepts(concepts: Record<string, ConceptStats>): Pick<
  SubjectStats,
  "attempts" | "correct" | "incorrect" | "mastery" | "difficulty"
> {
  const conceptStats = Object.values(concepts);
  const attempts = conceptStats.reduce((total, stats) => total + stats.attempts, 0);
  const correct = conceptStats.reduce((total, stats) => total + stats.correct, 0);
  const incorrect = conceptStats.reduce((total, stats) => total + stats.incorrect, 0);
  const evidence = conceptStats.reduce((total, stats) => total + stats.correct + stats.incorrect, 0);
  const mastery = evidence > 0
    ? Math.round(conceptStats.reduce(
      (total, stats) => total + stats.mastery * (stats.correct + stats.incorrect),
      0,
    ) / evidence)
    : 0;
  const difficultyWeight = conceptStats.reduce(
    (total, stats) => total + stats.difficulty * Math.max(1, stats.attempts),
    0,
  );
  const totalDifficultyWeight = conceptStats.reduce(
    (total, stats) => total + Math.max(1, stats.attempts),
    0,
  );

  return {
    attempts,
    correct,
    incorrect,
    mastery: Math.max(0, Math.min(100, mastery)),
    difficulty: totalDifficultyWeight > 0
      ? clampDifficulty(Math.round(difficultyWeight / totalDifficultyWeight))
      : 1,
  };
}

function restoreSubjectStats(value: unknown): Record<Subject, SubjectStats> {
  const stored = isRecord(value) ? value : {};

  return Object.fromEntries(
    SUBJECTS.map((subject) => {
      const subjectValue = stored[subject];
      if (!isRecord(subjectValue)) {
        return [subject, DEFAULT_SUBJECT_STATS()];
      }

      const attempts = isFiniteNumber(subjectValue.attempts) ? Math.max(0, subjectValue.attempts) : 0;
      const correct = isFiniteNumber(subjectValue.correct) ? Math.max(0, subjectValue.correct) : 0;
      const concepts = isRecord(subjectValue.concepts) ? subjectValue.concepts : {};
      const normalizedConceptEntries = Object.entries(concepts).flatMap(([name, stats]) => {
          const normalized = normalizeConceptStats(stats);
          if (!normalized) return [];
          if (name === LEGACY_CONCEPT_KEY) return [[name, normalized] as const];
          const matchingQuestions = QUESTIONS.filter(
            (question) => question.subject === subject && question.concept === name,
          );
          const conceptIds = new Set(matchingQuestions.map((question) => question.conceptId));
          const stableKey = conceptIds.size === 1
            ? [...conceptIds][0]!
            : QUESTIONS.some((question) => question.subject === subject && question.conceptId === name)
              ? name
              : LEGACY_CONCEPT_KEY;
          return [[stableKey, normalized] as const];
        });
      const normalizedConcepts = Object.fromEntries(normalizedConceptEntries) as Record<string, ConceptStats>;
      const knownAttempts = Object.values(normalizedConcepts)
        .reduce((total, stats) => total + stats.attempts, 0);
      const knownCorrect = Object.values(normalizedConcepts)
        .reduce((total, stats) => total + stats.correct, 0);
      const legacyAttempts = Math.max(0, Math.floor(attempts - knownAttempts));
      const legacyCorrect = Math.min(
        legacyAttempts,
        Math.max(0, Math.floor(correct - knownCorrect)),
      );
      if (legacyAttempts > 0 && !normalizedConcepts[LEGACY_CONCEPT_KEY]) {
        const legacyStats = normalizeConceptStats({
          attempts: legacyAttempts,
          correct: legacyCorrect,
          incorrect: legacyAttempts - legacyCorrect,
          difficulty: isFiniteNumber(subjectValue.difficulty) ? subjectValue.difficulty : 1,
        });
        if (legacyStats) {
          legacyStats.mastery = isFiniteNumber(subjectValue.mastery)
            ? Math.max(0, Math.min(100, subjectValue.mastery))
            : legacyStats.mastery;
          normalizedConcepts[LEGACY_CONCEPT_KEY] = legacyStats;
        }
      }
      return [subject, {
        ...summarizeSubjectConcepts(normalizedConcepts),
        concepts: normalizedConcepts,
      }];
    }),
  ) as Record<Subject, SubjectStats>;
}

function restoreTownBuildings(value: unknown): GameProgress["townBuildings"] {
  const stored = isRecord(value) ? value : {};
  return Object.fromEntries(
    BUILDING_IDS.map((buildingId) => {
      const savedBuilding = stored[buildingId];
      const initialBuilding = INITIAL_PROGRESS.townBuildings[buildingId];
      const completed = isRecord(savedBuilding) && savedBuilding.completed === true;
      return [buildingId, {
        ...initialBuilding,
        ...(isRecord(savedBuilding) && isFiniteNumber(savedBuilding.cost)
          ? { cost: Math.max(0, savedBuilding.cost) }
          : {}),
        ...(isRecord(savedBuilding) && isFiniteNumber(savedBuilding.materials)
          ? { materials: Math.max(0, savedBuilding.materials) }
          : {}),
        completed,
        status: completed ? "completed" : initialBuilding.status,
      }];
    }),
  ) as GameProgress["townBuildings"];
}

export function restoreGameProgress(value: unknown): GameProgress | null {
  if (!isRecord(value)) return null;

  const answered = value.answered;
  if (
    !isFiniteNumber(value.coins) ||
    !isFiniteNumber(value.xp) ||
    !isFiniteNumber(value.wire) ||
    !isFiniteNumber(value.repair) ||
    !isFiniteNumber(value.level) ||
    !isFiniteNumber(value.streak) ||
    !isFiniteNumber(value.misses) ||
    !Array.isArray(answered) ||
    !answered.every((id) => typeof id === "string") ||
    typeof value.builtWorkshop !== "boolean"
  ) {
    return null;
  }

  const progress: GameProgress = {
    ...INITIAL_PROGRESS,
    coins: Math.max(0, value.coins),
    xp: Math.max(0, value.xp),
    wire: Math.max(0, value.wire),
    repair: Math.max(0, Math.min(100, value.repair)),
    level: Math.max(1, Math.floor(value.level)),
    streak: Math.max(0, Math.floor(value.streak)),
    misses: Math.max(0, Math.floor(value.misses)),
    answered,
    builtWorkshop: value.builtWorkshop,
    materials: isFiniteNumber(value.materials) ? Math.max(0, value.materials) : 0,
    rewardEvents: Array.isArray(value.rewardEvents)
      ? value.rewardEvents.filter((event): event is string => typeof event === "string")
      : answered.map((id) => `reward:${id}`),
    subjectStats: restoreSubjectStats(value.subjectStats),
    townBuildings: restoreTownBuildings(value.townBuildings),
    plotsUnlocked: isFiniteNumber(value.plotsUnlocked) ? Math.max(2, Math.floor(value.plotsUnlocked)) : 2,
  };

  if (progress.builtWorkshop) {
    progress.townBuildings.workshop = {
      ...progress.townBuildings.workshop,
      completed: true,
      status: "completed",
    };
  }
  if (progress.repair >= 100) {
    progress.townBuildings["power-station"] = {
      ...progress.townBuildings["power-station"],
      completed: true,
      status: "completed",
    };
    if (!progress.rewardEvents.includes("mission-complete:power-station")) {
      progress.rewardEvents.push("mission-complete:power-station");
    }
  }

  return progress;
}

const QUESTION_SEEDS: QuestionSeed[] = [
  {
    id: "current",
    level: 1,
    subject: "physics",
    concept: "Ohm's law",
    prompt: "A circuit carries 2 amps of current through a 3-ohm resistor. What is the voltage?",
    options: ["1.5 volts", "6 volts", "5 volts", "0.6 volts"],
    answer: "6 volts",
    hint: "Ohm’s law: voltage = current × resistance.",
    explanation: "Voltage equals current multiplied by resistance, so 2 × 3 = 6 volts.",
  },
  {
    id: "ohms-law-voltage-easy",
    level: 1,
    subject: "physics",
    concept: "Ohm's law",
    prompt: "A 2-ohm lamp carries 3 amps. What voltage is across it?",
    options: ["1.5 V", "5 V", "6 V", "9 V"],
    answer: "6 V",
    hint: "Use V = I × R and multiply the current by the resistance.",
    explanation: "Ohm's law gives V = 3 × 2 = 6 volts.",
  },
  {
    id: "ohms-law-voltage-easy-two",
    level: 1,
    subject: "physics",
    concept: "Ohm's law",
    prompt: "A 4-ohm resistor carries 2 amps. What voltage does it use?",
    options: ["2 V", "6 V", "8 V", "12 V"],
    answer: "8 V",
    hint: "Multiply the current by the resistance using V = I × R.",
    explanation: "V = 2 × 4 = 8 volts.",
  },
  {
    id: "ohms-law-voltage-easy-three",
    level: 1,
    subject: "physics",
    concept: "Ohm's law",
    prompt: "What voltage is needed to push 4 amps through a 3-ohm resistor?",
    options: ["1.3 V", "7 V", "12 V", "16 V"],
    answer: "12 V",
    hint: "Multiply current by resistance.",
    explanation: "V = I × R, so 4 × 3 = 12 volts.",
  },
  {
    id: "series",
    level: 1,
    subject: "physics",
    concept: "Series circuits",
    prompt: "What happens to the other bulbs if one bulb breaks in a series circuit?",
    options: ["They all go out", "They get brighter", "Nothing changes", "They change color"],
    answer: "They all go out",
    hint: "A series circuit has only one path for electricity.",
    explanation: "In a series circuit, all bulbs share the same single path, so breaking one bulb opens the circuit.",
  },
  {
    id: "resistance",
    level: 2,
    subject: "physics",
    concept: "Resistance",
    prompt: "A 12-volt battery pushes 3 amps through a circuit. What is its resistance?",
    options: ["36 ohms", "4 ohms", "9 ohms", "0.25 ohms"],
    answer: "4 ohms",
    hint: "Rearrange Ohm’s law: resistance = voltage ÷ current.",
    explanation: "Resistance is voltage divided by current, so 12 ÷ 3 = 4 ohms.",
  },
  {
    id: "parallel",
    level: 2,
    subject: "physics",
    concept: "Parallel circuits",
    prompt: "Why can bulbs in a parallel circuit stay lit when another bulb is removed?",
    options: ["The battery doubles", "Each bulb has its own path", "Resistance becomes zero", "Current stops flowing"],
    answer: "Each bulb has its own path",
    hint: "Look for how many independent paths current can follow.",
    explanation: "Parallel circuits provide separate branches, so a break in one branch does not stop the others.",
  },
  {
    id: "power",
    level: 3,
    subject: "physics",
    concept: "Electrical power",
    prompt: "A device uses 12 volts and draws 2 amps. How much electrical power does it use?",
    options: ["6 watts", "10 watts", "24 watts", "14 watts"],
    answer: "24 watts",
    hint: "Power = voltage × current. One volt-amp is one watt.",
    explanation: "Power is current multiplied by voltage, so 2 × 12 = 24 watts.",
  },
  {
    id: "ohms-law-hard",
    level: 3,
    subject: "physics",
    concept: "Ohm's law",
    prompt: "A 9 V battery is connected to a 3 Ω resistor. What current flows?",
    options: ["0.3 A", "3 A", "6 A", "27 A"],
    answer: "3 A",
    hint: "Rearrange V = I × R to make current the subject.",
    explanation: "I = V ÷ R, so 9 ÷ 3 = 3 amps.",
  },
  {
    id: "ohms-law-medium-current",
    level: 2,
    subject: "physics",
    concept: "Ohm's law",
    prompt: "A 10 V supply is connected to a 5 Ω resistor. What current flows?",
    options: ["0.5 A", "2 A", "5 A", "50 A"],
    answer: "2 A",
    hint: "Rearrange V = I × R to find current.",
    explanation: "I = V ÷ R, so 10 ÷ 5 = 2 amps.",
  },
  {
    id: "ohms-law-medium-voltage",
    level: 2,
    subject: "physics",
    concept: "Ohm's law",
    prompt: "A 4 Ω resistor carries 2.5 A. What is the voltage?",
    options: ["1.6 V", "6.5 V", "10 V", "16 V"],
    answer: "10 V",
    hint: "Use V = I × R.",
    explanation: "Voltage is current multiplied by resistance: 2.5 × 4 = 10 volts.",
  },
  {
    id: "ohms-law-medium-resistance",
    level: 2,
    subject: "physics",
    concept: "Ohm's law",
    prompt: "A 15 V battery sends 3 A through a resistor. What is the resistance?",
    options: ["5 Ω", "12 Ω", "18 Ω", "45 Ω"],
    answer: "5 Ω",
    hint: "Rearrange Ohm's law so resistance equals voltage divided by current.",
    explanation: "R = V ÷ I, so 15 ÷ 3 = 5 ohms.",
  },
  {
    id: "equation-solve",
    level: 1,
    subject: "mathematics",
    concept: "Linear equations",
    prompt: "Solve for x: 3x + 4 = 19",
    options: ["x = 3", "x = 4", "x = 5", "x = 6"],
    answer: "x = 5",
    hint: "Subtract 4 from both sides, then divide by 3.",
    explanation: "3x + 4 = 19 gives 3x = 15, so x = 5.",
    prerequisiteConcepts: ["Arithmetic"],
  },
  {
    id: "equation-solve-easy",
    level: 1,
    subject: "mathematics",
    concept: "Linear equations",
    prompt: "Solve for x: 2x + 3 = 11",
    options: ["x = 3", "x = 4", "x = 5", "x = 7"],
    answer: "x = 4",
    hint: "Subtract 3 from both sides, then divide by 2.",
    explanation: "2x + 3 = 11 becomes 2x = 8, so x = 4.",
    prerequisiteConcepts: ["Arithmetic"],
  },
  {
    id: "equation-solve-easy-two",
    level: 1,
    subject: "mathematics",
    concept: "Linear equations",
    prompt: "Solve for x: 3x − 2 = 10",
    options: ["x = 2", "x = 3", "x = 4", "x = 6"],
    answer: "x = 4",
    hint: "Add 2 to both sides, then divide by 3.",
    explanation: "3x − 2 = 10 becomes 3x = 12, so x = 4.",
    prerequisiteConcepts: ["Arithmetic"],
  },
  {
    id: "area-rectangle",
    level: 1,
    subject: "mathematics",
    concept: "Area",
    prompt: "What is the area of a rectangle with width 6 cm and height 4 cm?",
    options: ["10 cm²", "18 cm²", "24 cm²", "28 cm²"],
    answer: "24 cm²",
    hint: "Area = length × width.",
    explanation: "Area is 6 × 4 = 24 square centimetres.",
  },
  {
    id: "algebra-ratio",
    level: 2,
    subject: "mathematics",
    concept: "Ratios",
    prompt: "If the ratio of red to blue marbles is 3:5 and there are 40 marbles total, how many are blue?",
    options: ["12", "15", "20", "25"],
    answer: "25",
    hint: "The total group size is 3 + 5 = 8 parts.",
    explanation: "Each part is 5 marbles, and blue is 5 parts, so 5 × 5 = 25.",
  },
  {
    id: "pythagoras",
    level: 2,
    subject: "mathematics",
    concept: "Pythagoras",
    prompt: "A right triangle has legs 3 and 4. What is the hypotenuse?",
    options: ["5", "6", "7", "8"],
    answer: "5",
    hint: "Use a² + b² = c².",
    explanation: "3² + 4² = 9 + 16 = 25, so c = 5.",
  },
  {
    id: "quadratic-root",
    level: 3,
    subject: "mathematics",
    concept: "Quadratic roots",
    prompt: "Which value is a root of x² − 5x + 6 = 0?",
    options: ["2", "4", "5", "7"],
    answer: "2",
    hint: "Factor the expression into (x − 2)(x − 3).",
    explanation: "The equation factors to (x − 2)(x − 3), so x = 2 or 3.",
  },
  {
    id: "addition-easy",
    level: 1,
    subject: "mathematics",
    concept: "Arithmetic",
    prompt: "A builder has 18 bricks and receives 7 more. How many bricks are there now?",
    options: ["24", "25", "26", "27"],
    answer: "25",
    hint: "Add the new bricks to the original amount.",
    explanation: "18 + 7 = 25 bricks.",
  },
  {
    id: "fraction-easy",
    level: 1,
    subject: "mathematics",
    concept: "Fractions",
    prompt: "What is one half of 14?",
    options: ["5", "6", "7", "8"],
    answer: "7",
    hint: "One half means divide the number into two equal groups.",
    explanation: "14 ÷ 2 = 7.",
  },
  {
    id: "multiplication-easy",
    level: 1,
    subject: "mathematics",
    concept: "Multiplication",
    prompt: "Each garden row has 5 plants. How many plants are in 4 rows?",
    options: ["9", "15", "20", "25"],
    answer: "20",
    hint: "Use repeated addition or multiply 5 by the number of rows.",
    explanation: "4 groups of 5 plants is 4 × 5 = 20 plants.",
  },
  {
    id: "equation-medium",
    level: 2,
    subject: "mathematics",
    concept: "Linear equations",
    prompt: "Solve for x: 4x − 6 = 18",
    options: ["x = 3", "x = 5", "x = 6", "x = 8"],
    answer: "x = 6",
    hint: "Add 6 to both sides, then divide by 4.",
    explanation: "4x − 6 = 18 becomes 4x = 24, so x = 6.",
    prerequisiteConcepts: ["Arithmetic"],
  },
  {
    id: "equation-medium-brackets",
    level: 2,
    subject: "mathematics",
    concept: "Linear equations",
    prompt: "Solve for x: 5(x − 2) = 20",
    options: ["x = 2", "x = 4", "x = 6", "x = 8"],
    answer: "x = 6",
    hint: "Divide both sides by 5, then add 2.",
    explanation: "5(x − 2) = 20 gives x − 2 = 4, so x = 6.",
    prerequisiteConcepts: ["Arithmetic"],
  },
  {
    id: "equation-medium-variable-both-sides",
    level: 2,
    subject: "mathematics",
    concept: "Linear equations",
    prompt: "Solve for x: 5x + 3 = 2x + 15",
    options: ["x = 3", "x = 4", "x = 5", "x = 6"],
    answer: "x = 4",
    hint: "Subtract 2x from both sides, then solve the remaining equation.",
    explanation: "5x + 3 = 2x + 15 becomes 3x = 12, so x = 4.",
    prerequisiteConcepts: ["Arithmetic"],
  },
  {
    id: "percent-medium",
    level: 2,
    subject: "mathematics",
    concept: "Percentages",
    prompt: "A town has 50 homes. If 10% have solar panels, how many homes is that?",
    options: ["2", "5", "10", "15"],
    answer: "5",
    hint: "Ten percent is one tenth. Divide the total by 10.",
    explanation: "50 ÷ 10 = 5 homes have solar panels.",
  },
  {
    id: "perimeter-medium",
    level: 2,
    subject: "mathematics",
    concept: "Perimeter",
    prompt: "A square plaza has sides of 8 metres. What is its perimeter?",
    options: ["16 m", "24 m", "32 m", "64 m"],
    answer: "32 m",
    hint: "A square has four equal sides. Add all four side lengths.",
    explanation: "The perimeter is 4 × 8 = 32 metres.",
  },
  {
    id: "volume-hard",
    level: 3,
    subject: "mathematics",
    concept: "Volume",
    prompt: "A storage box is 4 m long, 3 m wide, and 2 m high. What is its volume?",
    options: ["9 m³", "12 m³", "24 m³", "36 m³"],
    answer: "24 m³",
    hint: "Volume of a rectangular prism is length × width × height.",
    explanation: "4 × 3 × 2 = 24 cubic metres.",
  },
  {
    id: "fraction-hard",
    level: 3,
    subject: "mathematics",
    concept: "Fractions",
    prompt: "A recipe uses 3/4 cup of flour. You make half a recipe. How much flour do you need?",
    options: ["1/4 cup", "3/8 cup", "1/2 cup", "3/2 cups"],
    answer: "3/8 cup",
    hint: "Half of 3/4 is 3/4 multiplied by 1/2.",
    explanation: "3/4 × 1/2 = 3/8 cup.",
  },
  {
    id: "equation-hard",
    level: 3,
    subject: "mathematics",
    concept: "Linear equations",
    prompt: "Solve for x: 3(x + 2) = 2x + 11",
    options: ["x = 3", "x = 5", "x = 7", "x = 9"],
    answer: "x = 5",
    hint: "Expand the brackets, then collect the x terms on one side.",
    explanation: "3x + 6 = 2x + 11, so subtracting 2x and 6 gives x = 5.",
  },
  {
    id: "atom-layout",
    level: 1,
    subject: "chemistry",
    concept: "Atoms",
    prompt: "What is the charge of a proton?",
    options: ["Negative", "Neutral", "Positive", "Variable"],
    answer: "Positive",
    hint: "Protons are found in the nucleus and are the opposite of electrons.",
    explanation: "A proton carries a positive charge, while electrons carry negative charge.",
    prerequisiteConcepts: ["Particle identification"],
  },
  {
    id: "periodic-symbol-oxygen",
    level: 1,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "Which element has the symbol O?",
    options: ["Osmium", "Oxygen", "Gold", "Argon"],
    answer: "Oxygen",
    hint: "Oxygen is essential for respiration and the symbol is O.",
    explanation: "The chemical symbol O represents oxygen.",
  },
  {
    id: "reaction-rate",
    level: 2,
    subject: "chemistry",
    concept: "Chemical reactions",
    prompt: "Why does increasing temperature usually speed up a chemical reaction?",
    options: ["Particles move slower", "Particles collide less often", "Particles have more energy and collide more often", "Nothing changes"],
    answer: "Particles have more energy and collide more often",
    hint: "Higher temperature means faster particle movement.",
    explanation: "Faster-moving particles have more kinetic energy and collide more often, increasing reaction rate.",
  },
  {
    id: "acid-base",
    level: 1,
    subject: "chemistry",
    concept: "Acids and bases",
    prompt: "Which substance is most likely to be acidic?",
    options: ["Soap solution", "Lemon juice", "Salt water", "Baking soda"],
    answer: "Lemon juice",
    hint: "Acids often taste sour and include citrus fruits.",
    explanation: "Lemon juice contains citric acid, so it is acidic.",
  },
  {
    id: "compound-mass",
    level: 3,
    subject: "chemistry",
    concept: "Compounds",
    prompt: "Which of these is a compound?",
    options: ["Oxygen gas", "Helium", "Water", "Iron"],
    answer: "Water",
    hint: "A compound contains atoms of different elements chemically joined together.",
    explanation: "Water is made of hydrogen and oxygen atoms bonded together.",
  },
  {
    id: "compound-water",
    level: 1,
    subject: "chemistry",
    concept: "Compounds",
    prompt: "Water (H₂O) is best described as which of these?",
    options: ["An element", "A compound", "A single atom", "A mixture of metals"],
    answer: "A compound",
    hint: "Look at the formula: it contains more than one type of element chemically joined.",
    explanation: "Water is a compound because hydrogen and oxygen atoms are chemically bonded in a fixed ratio.",
  },
  {
    id: "atom-electron",
    level: 1,
    subject: "chemistry",
    concept: "Atoms",
    prompt: "Which particle has a negative electric charge?",
    options: ["Proton", "Neutron", "Electron", "Nucleus"],
    answer: "Electron",
    hint: "This very light particle moves around the atom's nucleus.",
    explanation: "Electrons have a negative charge; protons are positive and neutrons have no charge.",
    prerequisiteConcepts: ["Particle identification"],
  },
  {
    id: "periodic-symbol-na",
    level: 2,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "Which element has the chemical symbol Na?",
    options: ["Nitrogen", "Neon", "Sodium", "Nickel"],
    answer: "Sodium",
    hint: "Its symbol comes from the Latin name natrium.",
    explanation: "Na is the symbol for sodium. Chemical symbols can come from an element's Latin name.",
  },
  {
    id: "reaction-products",
    level: 2,
    subject: "chemistry",
    concept: "Chemical reactions",
    prompt: "In a chemical reaction, what are the substances made called?",
    options: ["Reactants", "Products", "Elements", "Solvents"],
    answer: "Products",
    hint: "Reactants go in; the substances formed come out.",
    explanation: "Products are the new substances formed from reactants during a chemical reaction.",
  },
  {
    id: "bonding-ionic",
    level: 2,
    subject: "chemistry",
    concept: "Chemical bonding",
    prompt: "What mainly holds the ions in solid sodium chloride together?",
    options: [
      "Attraction between positive and negative ions",
      "A shared pool of neutrons",
      "Gravity between the atoms",
      "A reaction with water",
    ],
    answer: "Attraction between positive and negative ions",
    hint: "Sodium chloride is an ionic compound with oppositely charged particles.",
    explanation: "Ionic bonding is the electrostatic attraction between oppositely charged ions, such as Na⁺ and Cl⁻.",
  },
  {
    id: "balance-water",
    level: 2,
    subject: "chemistry",
    concept: "Balancing equations",
    prompt: "Which equation balances hydrogen and oxygen atoms for making water?",
    options: ["H₂ + O₂ → H₂O", "2H₂ + O₂ → 2H₂O", "H₂ + 2O₂ → H₂O", "2H₂ + 2O₂ → H₂O"],
    answer: "2H₂ + O₂ → 2H₂O",
    hint: "Count each kind of atom on both sides; change coefficients, not formula subscripts.",
    explanation: "The balanced equation has four hydrogen atoms and two oxygen atoms on each side: 2H₂ + O₂ → 2H₂O.",
  },
  {
    id: "acid-ph",
    level: 3,
    subject: "chemistry",
    concept: "Acids and bases",
    prompt: "A solution has pH 3. Which statement is correct?",
    options: ["It is acidic", "It is neutral", "It is basic", "It contains no ions"],
    answer: "It is acidic",
    hint: "Values below 7 on the pH scale are acidic.",
    explanation: "A pH below 7 is acidic; pH 7 is neutral, and values above 7 are basic in the usual aqueous scale.",
  },
  {
    id: "neutralization",
    level: 3,
    subject: "chemistry",
    concept: "Acids and bases",
    prompt: "What are the products of hydrochloric acid reacting with sodium hydroxide?",
    options: ["Sodium chloride and water", "Hydrogen and oxygen", "Sodium and chlorine gas", "Carbon dioxide and water"],
    answer: "Sodium chloride and water",
    hint: "An acid reacting with a base is a neutralization reaction.",
    explanation: "HCl + NaOH → NaCl + H₂O. Acid-base neutralization forms a salt and water.",
  },
  {
    id: "periodic-valence",
    level: 2,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "Elements in the same column (group) of the periodic table often have similar chemistry because they have the same number of what?",
    options: ["Electron shells", "Valence electrons", "Neutrons", "Isotopes"],
    answer: "Valence electrons",
    hint: "These are the outer-shell electrons involved in bonding.",
    explanation: "For main-group elements, members of the same group generally share the same number of valence electrons, giving them similar chemical behavior.",
  },
  {
    id: "bonding-covalent",
    level: 3,
    subject: "chemistry",
    concept: "Chemical bonding",
    prompt: "How do atoms usually form a covalent bond?",
    options: ["By sharing electron pairs", "By sharing protons", "By losing all neutrons", "By becoming the same element"],
    answer: "By sharing electron pairs",
    hint: "Think of two atoms using some outer electrons together.",
    explanation: "A covalent bond forms when atoms share one or more pairs of electrons.",
  },
  {
    id: "atom-neutrons",
    level: 2,
    subject: "chemistry",
    concept: "Atoms",
    prompt: "A carbon-12 atom has atomic number 6. How many neutrons does its nucleus contain?",
    options: ["6", "12", "18", "It has none"],
    answer: "6",
    hint: "Mass number equals protons plus neutrons; atomic number gives the protons.",
    explanation: "Carbon-12 has 12 nucleons and 6 protons, so it has 12 − 6 = 6 neutrons.",
  },
  {
    id: "atom-electrons-easy",
    level: 1,
    subject: "chemistry",
    concept: "Atoms",
    prompt: "Which particle in an atom has a negative charge?",
    options: ["Proton", "Neutron", "Electron", "Nucleus"],
    answer: "Electron",
    hint: "It moves around the nucleus and has the opposite charge to a proton.",
    explanation: "An electron has a negative charge; protons are positive and neutrons are neutral.",
    prerequisiteConcepts: ["Particle identification"],
  },
  {
    id: "atom-protons-medium",
    level: 2,
    subject: "chemistry",
    concept: "Atoms",
    prompt: "An atom has atomic number 8. How many protons are in its nucleus?",
    options: ["4", "8", "16", "It depends on the isotope"],
    answer: "8",
    hint: "The atomic number is the count of protons.",
    explanation: "An element's atomic number equals its number of protons, so this atom has 8 protons.",
  },
  {
    id: "atom-mass-number-medium",
    level: 2,
    subject: "chemistry",
    concept: "Atoms",
    prompt: "An atom has 9 protons and 10 neutrons. What is its mass number?",
    options: ["1", "9", "10", "19"],
    answer: "19",
    hint: "Add the protons and neutrons to find the mass number.",
    explanation: "Mass number is protons plus neutrons: 9 + 10 = 19.",
  },
  {
    id: "atom-sodium-ion",
    level: 3,
    subject: "chemistry",
    concept: "Atoms",
    prompt: "A sodium atom has 11 protons. How many electrons are in a sodium ion, Na⁺?",
    options: ["10", "11", "12", "22"],
    answer: "10",
    hint: "A +1 charge means the ion has lost one negative electron.",
    explanation: "A neutral sodium atom has 11 electrons. Na⁺ has lost one, leaving 10 electrons.",
  },
  {
    id: "periodic-atomic-number",
    level: 3,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "What does an element's atomic number tell you?",
    options: ["Its number of protons", "Its number of neutrons in every isotope", "Its number of compounds", "Its number of electron shells only"],
    answer: "Its number of protons",
    hint: "This number identifies the element and is shown on the periodic table.",
    explanation: "The atomic number is the number of protons in an atom's nucleus. It defines which element the atom is.",
  },
  {
    id: "reaction-reactants",
    level: 1,
    subject: "chemistry",
    concept: "Chemical reactions",
    prompt: "In a chemical equation, what are the starting substances called?",
    options: ["Products", "Reactants", "Indicators", "Isotopes"],
    answer: "Reactants",
    hint: "They take part in the reaction and are written before the arrow.",
    explanation: "Reactants are the starting substances in a chemical reaction; products are formed after the reaction.",
  },
  {
    id: "reaction-conservation",
    level: 3,
    subject: "chemistry",
    concept: "Chemical reactions",
    prompt: "Why must a correctly balanced chemical equation have the same number of each type of atom on both sides?",
    options: [
      "Atoms are rearranged, not created or destroyed in the reaction",
      "Every reaction uses the same number of molecules",
      "The products must have the same formula as the reactants",
      "The coefficients cancel the atom symbols",
    ],
    answer: "Atoms are rearranged, not created or destroyed in the reaction",
    hint: "Think about conservation of matter during an ordinary chemical reaction.",
    explanation: "Chemical reactions rearrange atoms. Conservation of matter means each element's atom count is unchanged overall.",
  },
  {
    id: "balance-hydrogen-chlorine",
    level: 1,
    subject: "chemistry",
    concept: "Balancing equations",
    prompt: "Which equation is balanced for hydrogen reacting with chlorine to make hydrogen chloride?",
    options: ["H₂ + Cl₂ → 2HCl", "H₂ + Cl₂ → HCl", "2H₂ + Cl₂ → HCl", "H₂ + 2Cl₂ → HCl"],
    answer: "H₂ + Cl₂ → 2HCl",
    hint: "Count two hydrogen atoms and two chlorine atoms on both sides.",
    explanation: "H₂ + Cl₂ → 2HCl has two H and two Cl atoms on each side.",
  },
  {
    id: "balance-iron-oxide",
    level: 3,
    subject: "chemistry",
    concept: "Balancing equations",
    prompt: "Which coefficients balance iron reacting with oxygen to form iron(III) oxide?",
    options: ["2Fe + O₂ → Fe₂O₃", "4Fe + 3O₂ → 2Fe₂O₃", "Fe + 3O₂ → Fe₂O₃", "3Fe + 2O₂ → Fe₂O₃"],
    answer: "4Fe + 3O₂ → 2Fe₂O₃",
    hint: "Balance oxygen first using a common multiple of 2 and 3, then balance iron.",
    explanation: "4Fe + 3O₂ → 2Fe₂O₃ has four iron atoms and six oxygen atoms on each side.",
  },
  {
    id: "acid-ph-basic",
    level: 2,
    subject: "chemistry",
    concept: "Acids and bases",
    prompt: "A solution has pH 9. What is it?",
    options: ["Acidic", "Neutral", "Basic", "A pure element"],
    answer: "Basic",
    hint: "Aqueous solutions above pH 7 are usually described as basic.",
    explanation: "A pH greater than 7 is basic (alkaline); pH 7 is neutral and values below 7 are acidic.",
  },
  {
    id: "bonding-ionic-easy",
    level: 1,
    subject: "chemistry",
    concept: "Chemical bonding",
    prompt: "Which pair is most likely to form an ionic compound?",
    options: ["A metal and a non-metal", "Two noble gases", "Two neutrons", "Two water molecules"],
    answer: "A metal and a non-metal",
    hint: "One atom can transfer electrons to the other, creating oppositely charged ions.",
    explanation: "Ionic compounds commonly form when a metal transfers electrons to a non-metal, making ions that attract.",
  },
  {
    id: "compound-carbon-dioxide",
    level: 2,
    subject: "chemistry",
    concept: "Compounds",
    prompt: "How many oxygen atoms are in one molecule of carbon dioxide, CO₂?",
    options: ["1", "2", "3", "4"],
    answer: "2",
    hint: "The small 2 after O applies to the oxygen symbol.",
    explanation: "In CO₂ the subscript 2 means each molecule contains two oxygen atoms and one carbon atom.",
  },
  {
    id: "variable-type",
    level: 1,
    subject: "computer-science",
    concept: "Variables and data types",
    prompt: "Which of these is a valid variable name in most programming languages?",
    options: ["1score", "score_1", "score-value", "score value"],
    answer: "score_1",
    hint: "Variable names usually cannot start with a number and cannot contain spaces.",
    explanation: "A valid variable name must follow naming rules; score_1 is legal in most languages.",
  },
  {
    id: "if-condition",
    level: 1,
    subject: "computer-science",
    concept: "Conditional statements",
    prompt: "What does an if statement do?",
    options: ["Terminates the program", "Runs code only when a condition is true", "Creates a loop", "Declares a variable"],
    answer: "Runs code only when a condition is true",
    hint: "An if statement checks a condition before deciding what to do.",
    explanation: "If statements allow conditional logic by running code only when a test evaluates to true.",
  },
  {
    id: "loop-repeat",
    level: 2,
    subject: "computer-science",
    concept: "Loops",
    prompt: "Why use a loop in code?",
    options: ["To repeat a task without writing it many times", "To delete variables", "To prevent errors", "To print only one value"],
    answer: "To repeat a task without writing it many times",
    hint: "Loops are designed for repeated actions.",
    explanation: "A loop repeatedly executes the same block of code, which reduces duplication.",
  },
  {
    id: "array-index",
    level: 2,
    subject: "computer-science",
    concept: "Arrays",
    prompt: "In many languages, what is the index of the first item in an array?",
    options: ["0", "1", "-1", "Depends on the length"],
    answer: "0",
    hint: "Most modern languages start indexing at zero.",
    explanation: "Arrays usually start at index 0, so the first element is position 0.",
  },
  {
    id: "function-call",
    level: 3,
    subject: "computer-science",
    concept: "Functions",
    prompt: "What is the main purpose of a function?",
    options: ["To store a single constant", "To group repeated logic into one reusable block", "To make code run slower", "To disable debugging"],
    answer: "To group repeated logic into one reusable block",
    hint: "Functions are used to package instructions so they can be reused.",
    explanation: "Functions allow code to be reused and organized, reducing repetition in programs.",
  },
  {
    id: "cpp-variable",
    level: 1,
    subject: "computer-science",
    concept: "Variables and data types",
    prompt: "What value is stored in `count` after this C++ statement? `int count = 4;`",
    options: ["The integer 4", "The text \"count\"", "The decimal 4.0 only", "No value"],
    answer: "The integer 4",
    hint: "`int` declares a whole-number variable, and `=` assigns its starting value.",
    explanation: "`int count = 4;` creates an integer variable named count and stores the value 4 in it.",
  },
  {
    id: "cpp-output",
    level: 1,
    subject: "computer-science",
    concept: "Input and output",
    prompt: "What does `std::cout << \"Hi\";` do in C++?",
    options: ["Prints Hi", "Reads Hi from the keyboard", "Creates a variable named Hi", "Ends the program"],
    answer: "Prints Hi",
    hint: "`cout` sends output to the console, and `<<` sends a value to it.",
    explanation: "`std::cout` writes output to the console, so this statement displays Hi.",
  },
  {
    id: "cpp-if",
    level: 1,
    subject: "computer-science",
    concept: "Conditional statements",
    prompt: "When does the body of `if (score >= 10) { ... }` run?",
    options: ["When score is at least 10", "Only when score is below 10", "Every time, regardless of score", "Only when score is text"],
    answer: "When score is at least 10",
    hint: "`>=` means greater than or equal to.",
    explanation: "The condition is true when score is 10 or larger, so then the if body runs.",
  },
  {
    id: "cpp-for-sum",
    level: 2,
    subject: "computer-science",
    concept: "Loops",
    prompt: "What does this C++ code print?\n\nint sum = 0;\nfor (int i = 1; i <= 3; i++) {\n    sum += i;\n}\ncout << sum;",
    options: ["3", "5", "6", "123"],
    answer: "6",
    hint: "Trace i as 1, then 2, then 3, adding each value to sum.",
    explanation: "The loop adds 1 + 2 + 3 to sum. The final value printed is 6.",
  },
  {
    id: "cpp-while",
    level: 2,
    subject: "computer-science",
    concept: "Loops",
    prompt: "What values are printed by this C++ code?\n\nint i = 0;\nwhile (i < 3) {\n    cout << i;\n    i++;\n}",
    options: ["0 1 2", "1 2 3", "0 1 2 3", "The loop never ends"],
    answer: "0 1 2",
    hint: "The condition is checked before each pass, and i increases at the end.",
    explanation: "The loop prints 0, 1, and 2. When i becomes 3, i < 3 is false and the loop stops.",
  },
  {
    id: "cpp-function",
    level: 2,
    subject: "computer-science",
    concept: "Functions",
    prompt: "What does `int doubleIt(int n) { return n * 2; }` return when called as `doubleIt(4)`?",
    options: ["2", "4", "6", "8"],
    answer: "8",
    hint: "Substitute 4 for n, then multiply by 2.",
    explanation: "The function returns n × 2, so doubleIt(4) returns 8.",
  },
  {
    id: "cpp-array",
    level: 3,
    subject: "computer-science",
    concept: "Arrays",
    prompt: "Given this C++ array, what does `cout << values[1];` print?\n\nint values[3] = {4, 7, 9};",
    options: ["4", "7", "9", "1"],
    answer: "7",
    hint: "C++ array indexing starts at zero: indices 0, 1, and 2.",
    explanation: "`values[0]` is 4, `values[1]` is 7, and `values[2]` is 9.",
  },
  {
    id: "cpp-string",
    level: 3,
    subject: "computer-science",
    concept: "Strings",
    prompt: "What does `std::string word = \"cat\"; word.size();` report?",
    options: ["2", "3", "4", "The letter c"],
    answer: "3",
    hint: "Count the characters in the string.",
    explanation: "The string cat contains three characters, so its size is 3.",
  },
  {
    id: "cpp-debug-condition",
    level: 3,
    subject: "computer-science",
    concept: "Debugging conditions",
    prompt: "In C++, which operator should compare `score` with 10 in `if (score __ 10)`?",
    options: ["=", "==", "+=", "->"],
    answer: "==",
    hint: "A single equals sign assigns a value; comparison uses a different operator.",
    explanation: "`==` tests whether two values are equal. A single `=` assigns a value and is not the equality comparison operator.",
  },
  {
    id: "cpp-input",
    level: 1,
    subject: "computer-science",
    concept: "Input and output",
    prompt: "What does `std::cin >> age;` do in C++?",
    options: ["Reads a value from input and stores it in age", "Prints age to the screen", "Creates a loop", "Clears the variable"],
    answer: "Reads a value from input and stores it in age",
    hint: "`cin` is the console input stream; `>>` sends the entered value into a variable.",
    explanation: "`std::cin >> age;` waits for input and stores the entered value in the variable named age.",
  },
  {
    id: "cpp-stream-arithmetic",
    level: 2,
    subject: "computer-science",
    concept: "Input and output",
    prompt: "If the user enters 4, what does this C++ code print?\n\nint number;\nstd::cin >> number;\nstd::cout << number + 1;",
    options: ["3", "4", "5", "number + 1"],
    answer: "5",
    hint: "First store the input in number, then add one before printing.",
    explanation: "The input makes number equal to 4. The output expression is 4 + 1, so the program prints 5.",
  },
  {
    id: "cpp-getline",
    level: 3,
    subject: "computer-science",
    concept: "Input and output",
    prompt: "Which C++ function reads an entire line, including spaces, into a string named `name`?",
    options: ["std::getline(std::cin, name)", "std::cout >> name", "std::cin << name", "std::printline(name)"],
    answer: "std::getline(std::cin, name)",
    hint: "The function name combines the words for getting a complete line.",
    explanation: "`std::getline` reads characters up to the line ending, including spaces, and stores them in the string.",
  },
  {
    id: "cpp-double-variable",
    level: 2,
    subject: "computer-science",
    concept: "Variables and data types",
    prompt: "Which C++ type is a suitable choice for a measurement such as 2.75 metres?",
    options: ["bool", "double", "char", "void"],
    answer: "double",
    hint: "Choose a type that can represent a number with a fractional part.",
    explanation: "`double` stores floating-point numbers, so it can represent values such as 2.75.",
  },
  {
    id: "cpp-integer-division",
    level: 3,
    subject: "computer-science",
    concept: "Variables and data types",
    prompt: "What value is stored in `result` after `int result = 7 / 2;` in C++?",
    options: ["3", "3.5", "4", "An error in every C++ compiler"],
    answer: "3",
    hint: "Both operands are integers, so integer division drops the fractional part.",
    explanation: "Integer division of 7 by 2 gives 3, with the fractional part discarded.",
  },
  {
    id: "cpp-for-purpose",
    level: 1,
    subject: "computer-science",
    concept: "Loops",
    prompt: "What is a common reason to use a `for` loop in C++?",
    options: ["Repeat instructions, often a known number of times", "Store a decimal value", "Compare two strings only", "End a function immediately"],
    answer: "Repeat instructions, often a known number of times",
    hint: "A loop runs its body repeatedly while its condition allows it.",
    explanation: "A `for` loop is useful for repeating work, especially when the number of repetitions is known or controlled by a counter.",
    prerequisiteConcepts: ["Variables and data types"],
  },
  {
    id: "cpp-loop-counter-easy",
    level: 1,
    subject: "computer-science",
    concept: "Loops",
    prompt: "How many times does this loop print `Go`?\n\nfor (int i = 0; i < 2; i++) {\n    cout << \"Go\";\n}",
    options: ["1", "2", "3", "It never runs"],
    answer: "2",
    hint: "The counter takes the values 0 and 1 before the condition becomes false.",
    explanation: "The loop runs once for i = 0 and once for i = 1, so it prints Go twice.",
    prerequisiteConcepts: ["Variables and data types"],
  },
  {
    id: "cpp-loop-start-easy",
    level: 1,
    subject: "computer-science",
    concept: "Loops",
    prompt: "What is the first value printed by this loop?\n\nfor (int i = 2; i < 5; i++) {\n    cout << i;\n}",
    options: ["0", "1", "2", "5"],
    answer: "2",
    hint: "The loop starts by setting i to 2 before checking the condition.",
    explanation: "The first loop pass uses i = 2, so 2 is printed first.",
    prerequisiteConcepts: ["Variables and data types"],
  },
  {
    id: "cpp-nested-loops",
    level: 3,
    subject: "computer-science",
    concept: "Loops",
    prompt: "How many times does `cout << \"*\";` run?\n\nfor (int row = 0; row < 2; row++) {\n    for (int col = 0; col < 3; col++) {\n        cout << \"*\";\n    }\n}",
    options: ["2", "3", "5", "6"],
    answer: "6",
    hint: "The inner loop runs three times for each of the two outer-loop passes.",
    explanation: "The inner loop prints three stars on each of two rows, for 2 × 3 = 6 executions.",
  },
  {
    id: "cpp-array-initializer",
    level: 1,
    subject: "computer-science",
    concept: "Arrays",
    prompt: "How many values are stored by `int scores[3] = {8, 6, 9};`?",
    options: ["2", "3", "8", "9"],
    answer: "3",
    hint: "Count the values inside the braces.",
    explanation: "The array initializer contains three values, so the array stores three integers.",
  },
  {
    id: "cpp-string-size-medium",
    level: 2,
    subject: "computer-science",
    concept: "Strings",
    prompt: "What is the result of `std::string first = \"Chase\"; first.size();`?",
    options: ["4", "5", "6", "The letter C"],
    answer: "5",
    hint: "Count the letters in Chase; there is no extra space in the string.",
    explanation: "The word Chase has five characters, so `first.size()` returns 5.",
  },
  {
    id: "cpp-condition-trace",
    level: 2,
    subject: "computer-science",
    concept: "Conditional statements",
    prompt: "What does this code print when `score` is 8?\n\nif (score >= 10) {\n    cout << \"Ready\";\n} else {\n    cout << \"Keep going\";\n}",
    options: ["Ready", "Keep going", "8", "Nothing"],
    answer: "Keep going",
    hint: "Since 8 is less than 10, the if condition is false and the else branch runs.",
    explanation: "The condition 8 >= 10 is false, so the program executes the `else` branch and prints Keep going.",
  },
  {
    id: "equation-hard-distribute",
    level: 3,
    subject: "mathematics",
    concept: "Linear equations",
    prompt: "Solve for x: 2(5x − 3) = 14",
    options: ["x = 1", "x = 2", "x = 3", "x = 4"],
    answer: "x = 2",
    hint: "Divide both sides by 2 first, then undo subtraction and multiplication.",
    explanation: "Divide by 2 to get 5x − 3 = 7. Add 3, then divide by 5: x = 2.",
    prerequisiteConcepts: ["Arithmetic"],
  },
  {
    id: "equation-hard-fractions",
    level: 3,
    subject: "mathematics",
    concept: "Linear equations",
    prompt: "Solve for x: (3x − 2) / 4 = 5",
    options: ["x = 6", "x = 7", "x = 22/3", "x = 12"],
    answer: "x = 22/3",
    hint: "Multiply both sides by 4, then isolate x.",
    explanation: "3x − 2 = 20, so 3x = 22 and x = 22/3.",
    prerequisiteConcepts: ["Arithmetic"],
  },
  {
    id: "atom-charge-match-medium",
    level: 2,
    subject: "chemistry",
    concept: "Atoms",
    prompt: "Which set correctly matches each subatomic particle to its charge?",
    options: [
      "Proton +, neutron 0, electron −",
      "Proton −, neutron +, electron 0",
      "Proton 0, neutron −, electron +",
      "All three are neutral",
    ],
    answer: "Proton +, neutron 0, electron −",
    hint: "A proton is positive, an electron is negative, and a neutron has no charge.",
    explanation: "Protons carry positive charge, neutrons are neutral, and electrons carry negative charge.",
    prerequisiteConcepts: ["Particle identification"],
  },
  {
    id: "atom-neutral-particle-medium",
    level: 2,
    subject: "chemistry",
    concept: "Atoms",
    prompt: "Which particle has no electric charge?",
    options: ["Proton", "Neutron", "Electron", "Positive ion"],
    answer: "Neutron",
    hint: "Its name is a clue: it is electrically neutral.",
    explanation: "A neutron has zero charge; protons are positive and electrons are negative.",
    prerequisiteConcepts: ["Particle identification"],
  },
  {
    id: "atom-charge-count-hard",
    level: 3,
    subject: "chemistry",
    concept: "Atoms",
    prompt: "An ion has 12 protons and 10 electrons. What is its overall charge?",
    options: ["2−", "1−", "1+", "2+"],
    answer: "2+",
    hint: "Compare the positive proton count with the negative electron count.",
    explanation: "There are two more positive protons than negative electrons, so the ion has a 2+ charge.",
    prerequisiteConcepts: ["Particle identification"],
  },
  {
    id: "atom-charge-change-hard",
    level: 3,
    subject: "chemistry",
    concept: "Atoms",
    prompt: "A neutral atom loses two electrons. What charge does it have afterward?",
    options: ["2−", "1−", "1+", "2+"],
    answer: "2+",
    hint: "Electrons are negative, so losing them leaves more positive charge.",
    explanation: "Losing two negatively charged electrons leaves the atom with an overall 2+ charge.",
    prerequisiteConcepts: ["Particle identification"],
  },
  {
    id: "particle-identification-nucleus",
    level: 1,
    subject: "chemistry",
    concept: "Particle identification",
    prompt: "Which two subatomic particles are found in an atom's nucleus?",
    options: [
      "Protons and neutrons",
      "Electrons and protons",
      "Electrons and neutrons",
      "Only electrons",
    ],
    answer: "Protons and neutrons",
    hint: "The nucleus is the small, dense centre of the atom.",
    explanation: "Protons and neutrons are in the nucleus; electrons occupy the space around it.",
  },
  {
    id: "particle-identification-electron",
    level: 1,
    subject: "chemistry",
    concept: "Particle identification",
    prompt: "Where are electrons found in a simple model of an atom?",
    options: [
      "In the nucleus",
      "In the space around the nucleus",
      "Inside protons",
      "Only between atoms",
    ],
    answer: "In the space around the nucleus",
    hint: "The nucleus contains protons and neutrons.",
    explanation: "Electrons occupy the region around the nucleus, while protons and neutrons are in the nucleus.",
  },
  {
    id: "ohms-law-hard-power",
    level: 3,
    subject: "physics",
    concept: "Ohm's law",
    prompt: "A 12 V source drives 0.5 A through a component. What is its resistance?",
    options: ["6 Ω", "12 Ω", "24 Ω", "48 Ω"],
    answer: "24 Ω",
    hint: "Use R = V ÷ I.",
    explanation: "R = 12 ÷ 0.5 = 24 ohms.",
  },
  {
    id: "ohms-law-hard-combined",
    level: 3,
    subject: "physics",
    concept: "Ohm's law",
    prompt: "A 6 Ω resistor is connected to a 9 V supply. What current flows?",
    options: ["0.67 A", "1.5 A", "3 A", "54 A"],
    answer: "1.5 A",
    hint: "Rearrange V = I × R to find I.",
    explanation: "I = V ÷ R = 9 ÷ 6 = 1.5 amps.",
  },
  {
    id: "area-garden-easy",
    level: 1,
    subject: "mathematics",
    concept: "Area",
    prompt: "A square garden has sides of 3 m. What is its area?",
    options: ["6 m²", "9 m²", "12 m²", "3 m²"],
    answer: "9 m²",
    hint: "Multiply the side length by itself.",
    explanation: "The area is 3 × 3 = 9 square metres.",
  },
  {
    id: "arithmetic-subtraction-easy",
    level: 1,
    subject: "mathematics",
    concept: "Arithmetic",
    prompt: "The workshop has 23 boards and uses 8. How many remain?",
    options: ["13", "14", "15", "16"],
    answer: "15",
    hint: "Subtract the boards used from the starting amount.",
    explanation: "23 − 8 = 15 boards remain.",
  },
  {
    id: "fraction-quarter-easy",
    level: 1,
    subject: "mathematics",
    concept: "Fractions",
    prompt: "What is one quarter of 20?",
    options: ["4", "5", "10", "15"],
    answer: "5",
    hint: "Divide 20 into four equal groups.",
    explanation: "20 ÷ 4 = 5.",
  },
  {
    id: "fraction-equivalent-hard",
    level: 3,
    subject: "mathematics",
    concept: "Fractions",
    prompt: "A tank is 2/3 full. What fraction of its current water must be used to leave it 1/3 full?",
    options: ["1/3", "1/2", "2/3", "3/4"],
    answer: "1/2",
    hint: "Compare the amount to remove, 1/3 of the tank, with the current 2/3.",
    explanation: "Removing 1/3 of the tank from its current 2/3 leaves 1/3. That removed amount is half of 2/3.",
  },
  {
    id: "multiplication-packs-easy",
    level: 1,
    subject: "mathematics",
    concept: "Multiplication",
    prompt: "There are 6 seed packets with 3 seeds in each. How many seeds are there?",
    options: ["9", "18", "21", "36"],
    answer: "18",
    hint: "Multiply the number of packets by the seeds in each packet.",
    explanation: "6 × 3 = 18 seeds.",
  },
  {
    id: "percent-discount-medium",
    level: 2,
    subject: "mathematics",
    concept: "Percentages",
    prompt: "A 20% discount is applied to a 30-coin item. How many coins are taken off?",
    options: ["3", "5", "6", "10"],
    answer: "6",
    hint: "Find one tenth of 30, then double it.",
    explanation: "10% of 30 is 3, so 20% is 6 coins.",
  },
  {
    id: "perimeter-rectangle-medium",
    level: 2,
    subject: "mathematics",
    concept: "Perimeter",
    prompt: "A rectangle is 7 m long and 3 m wide. What is its perimeter?",
    options: ["10 m", "20 m", "21 m", "42 m"],
    answer: "20 m",
    hint: "Add both lengths and both widths.",
    explanation: "7 + 3 + 7 + 3 = 20 metres.",
  },
  {
    id: "pythagoras-ladder-medium",
    level: 2,
    subject: "mathematics",
    concept: "Pythagoras",
    prompt: "A ladder reaches 12 m up a wall and its base is 5 m from the wall. How long is it?",
    options: ["13 m", "15 m", "17 m", "60 m"],
    answer: "13 m",
    hint: "The ladder is the hypotenuse: square both shorter sides, add, then take the square root.",
    explanation: "√(5² + 12²) = √169 = 13 metres.",
  },
  {
    id: "quadratic-root-three-hard",
    level: 3,
    subject: "mathematics",
    concept: "Quadratic roots",
    prompt: "Which value is a root of x² − 7x + 12 = 0?",
    options: ["1", "3", "5", "7"],
    answer: "3",
    hint: "Factor the quadratic into two binomials.",
    explanation: "x² − 7x + 12 = (x − 3)(x − 4), so 3 is a root.",
  },
  {
    id: "ratio-paint-medium",
    level: 2,
    subject: "mathematics",
    concept: "Ratios",
    prompt: "Blue and white paint are mixed in a 2:3 ratio. If 10 litres of blue paint are used, how much white paint is needed?",
    options: ["12 L", "15 L", "20 L", "25 L"],
    answer: "15 L",
    hint: "The blue part is multiplied by 5, so multiply the white part by 5 too.",
    explanation: "The scale factor is 10 ÷ 2 = 5; white paint is 3 × 5 = 15 litres.",
  },
  {
    id: "volume-cube-hard",
    level: 3,
    subject: "mathematics",
    concept: "Volume",
    prompt: "A cube has edges of 5 cm. What is its volume?",
    options: ["25 cm³", "75 cm³", "100 cm³", "125 cm³"],
    answer: "125 cm³",
    hint: "Multiply length × width × height; all three edges are 5 cm.",
    explanation: "5 × 5 × 5 = 125 cubic centimetres.",
  },
  {
    id: "acid-indicator-easy",
    level: 1,
    subject: "chemistry",
    concept: "Acids and bases",
    prompt: "What colour does blue litmus paper turn in an acid?",
    options: ["Red", "Blue", "Green", "White"],
    answer: "Red",
    hint: "Acids change blue litmus to the warm colour commonly paired with acidity.",
    explanation: "Blue litmus paper turns red in an acidic solution.",
  },
  {
    id: "acid-ph-medium",
    level: 2,
    subject: "chemistry",
    concept: "Acids and bases",
    prompt: "A solution has pH 3. Is it acidic, neutral or alkaline?",
    options: ["Acidic", "Neutral", "Alkaline", "It cannot be determined"],
    answer: "Acidic",
    hint: "Values below 7 are acidic.",
    explanation: "A pH below 7 is acidic, so a solution at pH 3 is acidic.",
  },
  {
    id: "atom-isotope-hard",
    level: 3,
    subject: "chemistry",
    concept: "Atoms",
    prompt: "Two isotopes of carbon both have 6 protons but different mass numbers. What differs?",
    options: ["Their proton numbers", "Their neutron numbers", "Their element symbols", "Their nuclear charges"],
    answer: "Their neutron numbers",
    hint: "Mass number is protons plus neutrons; the proton count stays fixed for an element.",
    explanation: "Isotopes of an element have the same number of protons but different numbers of neutrons.",
  },
  {
    id: "balance-magnesium-easy",
    level: 1,
    subject: "chemistry",
    concept: "Balancing equations",
    prompt: "Which number belongs before O₂ to balance Mg + O₂ → MgO?",
    options: ["1", "2", "3", "4"],
    answer: "1",
    hint: "Balance oxygen by making two MgO units, then balance magnesium too.",
    explanation: "The balanced equation is 2Mg + O₂ → 2MgO, so the coefficient before O₂ is 1.",
  },
  {
    id: "balance-iron-medium",
    level: 2,
    subject: "chemistry",
    concept: "Balancing equations",
    prompt: "What coefficient balances iron in 2Fe + 3Cl₂ → 2FeCl₃?",
    options: ["1", "2", "3", "6"],
    answer: "2",
    hint: "Count the iron atoms on the product side.",
    explanation: "There are two iron atoms in 2FeCl₃, so the coefficient for iron is 2.",
  },
  {
    id: "balance-ammonia-hard",
    level: 3,
    subject: "chemistry",
    concept: "Balancing equations",
    prompt: "Which coefficients balance N₂ + H₂ → NH₃?",
    options: ["1, 3, 2", "1, 2, 1", "2, 3, 2", "2, 1, 3"],
    answer: "1, 3, 2",
    hint: "Make two ammonia molecules to balance nitrogen, then count hydrogen.",
    explanation: "N₂ + 3H₂ → 2NH₃ has two nitrogen atoms and six hydrogen atoms on each side.",
  },
  {
    id: "bonding-ionic-hard",
    level: 3,
    subject: "chemistry",
    concept: "Chemical bonding",
    prompt: "What happens to an electron when sodium forms a Na⁺ ion?",
    options: ["Sodium gains one electron", "Sodium loses one electron", "Sodium shares one neutron", "Nothing changes"],
    answer: "Sodium loses one electron",
    hint: "A positive ion has fewer electrons than protons.",
    explanation: "A sodium atom loses one negatively charged electron to form Na⁺.",
  },
  {
    id: "bonding-covalent-easy",
    level: 1,
    subject: "chemistry",
    concept: "Chemical bonding",
    prompt: "What do atoms share to form a covalent bond?",
    options: ["Electron pairs", "Protons", "Neutrons", "Whole nuclei"],
    answer: "Electron pairs",
    hint: "Covalent bonds involve outer electrons shared between atoms.",
    explanation: "Covalent bonds form when atoms share one or more pairs of electrons.",
  },
  {
    id: "bonding-covalent-hard",
    level: 3,
    subject: "chemistry",
    concept: "Chemical bonding",
    prompt: "How many shared electron pairs form a double covalent bond?",
    options: ["One", "Two", "Three", "Four"],
    answer: "Two",
    hint: "A double bond shares twice as many pairs as a single bond.",
    explanation: "A double covalent bond consists of two shared pairs of electrons.",
  },
  {
    id: "reaction-evidence-easy",
    level: 1,
    subject: "chemistry",
    concept: "Chemical reactions",
    prompt: "Which observation can be evidence that a chemical reaction has occurred?",
    options: ["A new gas forms", "A shape is cut smaller", "A solid is moved", "A liquid is poured"],
    answer: "A new gas forms",
    hint: "Look for evidence that a new substance has been produced.",
    explanation: "Gas production can indicate that a new substance formed during a chemical reaction.",
  },
  {
    id: "reaction-conservation-hard",
    level: 3,
    subject: "chemistry",
    concept: "Chemical reactions",
    prompt: "In a closed system, why does total mass stay the same during a chemical reaction?",
    options: ["Atoms are rearranged, not created or destroyed", "Reactants vanish completely", "Products have no mass", "Energy becomes atoms"],
    answer: "Atoms are rearranged, not created or destroyed",
    hint: "Count the atoms before and after the reaction.",
    explanation: "Chemical reactions rearrange atoms; in a closed system the same atoms remain, so total mass is conserved.",
  },
  {
    id: "symbol-hydrogen-easy",
    level: 1,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "Which element has the symbol H?",
    options: ["Helium", "Hydrogen", "Hafnium", "Holmium"],
    answer: "Hydrogen",
    hint: "It is the lightest element and appears in water.",
    explanation: "The chemical symbol H represents hydrogen.",
  },
  {
    id: "symbol-chlorine-medium",
    level: 2,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "Which element is represented by the symbol Cl?",
    options: ["Calcium", "Carbon", "Chlorine", "Cobalt"],
    answer: "Chlorine",
    hint: "Its symbol uses the first two letters of its name.",
    explanation: "Cl is the chemical symbol for chlorine.",
  },
  {
    id: "symbol-iron-medium",
    level: 2,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "Which element has the symbol Fe?",
    options: ["Fluorine", "Iron", "Fermium", "Francium"],
    answer: "Iron",
    hint: "The symbol comes from the Latin name ferrum.",
    explanation: "Fe is iron's symbol, derived from the Latin word ferrum.",
  },
  {
    id: "symbol-copper-hard",
    level: 3,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "Which element is represented by Cu?",
    options: ["Calcium", "Copper", "Curium", "Carbon"],
    answer: "Copper",
    hint: "Its symbol comes from the Latin name cuprum.",
    explanation: "Cu is the symbol for copper, from the Latin word cuprum.",
  },
  {
    id: "compound-water-medium",
    level: 2,
    subject: "chemistry",
    concept: "Compounds",
    prompt: "How many different elements are present in one H₂O molecule?",
    options: ["1", "2", "3", "4"],
    answer: "2",
    hint: "Count the distinct element symbols, not the atoms.",
    explanation: "H₂O contains hydrogen and oxygen, so it has two different elements.",
  },
  {
    id: "compound-formula-hard",
    level: 3,
    subject: "chemistry",
    concept: "Compounds",
    prompt: "How many oxygen atoms are in three molecules of CO₂?",
    options: ["2", "3", "5", "6"],
    answer: "6",
    hint: "Each molecule has two oxygen atoms; multiply by three molecules.",
    explanation: "Three molecules each contain two oxygen atoms, giving 3 × 2 = 6 oxygen atoms.",
  },
  {
    id: "compound-mixture-easy",
    level: 1,
    subject: "chemistry",
    concept: "Compounds",
    prompt: "Which statement describes a compound?",
    options: ["Different elements chemically joined", "One type of atom only", "Substances mixed without bonding", "A single proton"],
    answer: "Different elements chemically joined",
    hint: "A compound contains more than one element joined by chemical bonds.",
    explanation: "A compound is formed from different elements chemically bonded together.",
  },
  {
    id: "atomic-number-medium",
    level: 2,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "An atom has 11 protons. What is its atomic number?",
    options: ["1", "11", "22", "It depends on its neutrons"],
    answer: "11",
    hint: "Atomic number equals the number of protons.",
    explanation: "An element's atomic number is its proton count, so this atom's atomic number is 11.",
  },
  {
    id: "atomic-number-chlorine-medium",
    level: 2,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "A chlorine atom contains 17 protons and 18 neutrons. What is its atomic number?",
    options: ["1", "17", "18", "35"],
    answer: "17",
    hint: "Neutrons affect mass number, not atomic number.",
    explanation: "Atomic number is the proton count, so this chlorine atom has atomic number 17.",
  },
  {
    id: "atomic-number-isotope-hard",
    level: 3,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "Two atoms have the same atomic number but different neutron counts. What are they?",
    options: ["Different elements", "Isotopes of the same element", "Ions with the same charge", "Compounds"],
    answer: "Isotopes of the same element",
    hint: "The proton count identifies the element; neutron counts can vary.",
    explanation: "Atoms with the same proton count but different neutron counts are isotopes of that element.",
  },
  {
    id: "parallel-branches-medium",
    level: 2,
    subject: "physics",
    concept: "Parallel circuits",
    prompt: "What happens to the other branch of a parallel circuit if one branch opens?",
    options: ["It can keep working", "All branches must stop", "Its voltage becomes zero always", "The battery disappears"],
    answer: "It can keep working",
    hint: "Parallel branches provide separate paths for current.",
    explanation: "The other branch has its own path, so it can continue working when one branch opens.",
  },
  {
    id: "resistance-series-medium",
    level: 2,
    subject: "physics",
    concept: "Resistance",
    prompt: "Two 4 Ω resistors are connected in series. What is their total resistance?",
    options: ["2 Ω", "4 Ω", "8 Ω", "16 Ω"],
    answer: "8 Ω",
    hint: "For resistors in series, add their resistances.",
    explanation: "4 Ω + 4 Ω = 8 Ω total resistance.",
  },
  {
    id: "series-current-easy",
    level: 1,
    subject: "physics",
    concept: "Series circuits",
    prompt: "In a simple series circuit, how many paths does current have?",
    options: ["One", "Two", "Three", "It has no path"],
    answer: "One",
    hint: "Series components are connected along a single route.",
    explanation: "A series circuit has one path for current through all its components.",
  },
  {
    id: "power-energy-hard",
    level: 3,
    subject: "physics",
    concept: "Electrical power",
    prompt: "A device uses 2 A from a 12 V supply. What is its electrical power?",
    options: ["6 W", "10 W", "24 W", "48 W"],
    answer: "24 W",
    hint: "Power equals voltage multiplied by current.",
    explanation: "P = V × I = 12 × 2 = 24 watts.",
  },
  {
    id: "array-length-easy",
    level: 1,
    subject: "computer-science",
    concept: "Arrays",
    prompt: "How many values can `int marks[4];` hold?",
    options: ["3", "4", "5", "It depends on the values"],
    answer: "4",
    hint: "The number in the brackets gives the array length.",
    explanation: "The declaration reserves space for four integer values.",
  },
  {
    id: "array-last-index-medium",
    level: 2,
    subject: "computer-science",
    concept: "Arrays",
    prompt: "What is the last valid index of an array with 5 items when indexing starts at 0?",
    options: ["3", "4", "5", "6"],
    answer: "4",
    hint: "The first item is index 0, so subtract one from the item count.",
    explanation: "An array of five items uses indices 0 through 4.",
  },
  {
    id: "array-update-hard",
    level: 3,
    subject: "computer-science",
    concept: "Arrays",
    prompt: "In C++, what does `scores[2] = 10;` change?",
    options: ["The third array element", "The second array element", "The array length", "Every element"],
    answer: "The third array element",
    hint: "Array indices start at zero.",
    explanation: "Index 2 refers to the third element, so only that element is assigned 10.",
  },
  {
    id: "condition-else-if-medium",
    level: 2,
    subject: "computer-science",
    concept: "Conditional statements",
    prompt: "When is an `else` block executed?",
    options: ["When the preceding if condition is false", "Before the if condition", "On every loop pass", "Only when a variable is declared"],
    answer: "When the preceding if condition is false",
    hint: "The else path is the alternative to a true if condition.",
    explanation: "An else block runs when its associated if condition evaluates to false.",
  },
  {
    id: "debug-condition-easy",
    level: 1,
    subject: "computer-science",
    concept: "Debugging conditions",
    prompt: "Which operator checks whether two values are equal in a C++ condition?",
    options: ["=", "==", "!=", "=>"],
    answer: "==",
    hint: "Assignment uses one equals sign; comparison uses two.",
    explanation: "The `==` operator compares two values for equality; `=` assigns a value.",
  },
  {
    id: "debug-condition-easy-boundary",
    level: 1,
    subject: "computer-science",
    concept: "Debugging conditions",
    prompt: "Which condition includes the value 5 as well as values greater than 5?",
    options: ["x > 5", "x >= 5", "x < 5", "x != 5"],
    answer: "x >= 5",
    hint: "The equals sign includes the boundary value.",
    explanation: "`>=` means greater than or equal to, so it includes 5.",
  },
  {
    id: "debug-condition-medium",
    level: 2,
    subject: "computer-science",
    concept: "Debugging conditions",
    prompt: "What is wrong with `if (score = 10)` when the intent is to compare score to 10?",
    options: ["It assigns 10 instead of comparing", "It compares correctly", "It declares score", "It checks whether score is negative"],
    answer: "It assigns 10 instead of comparing",
    hint: "C++ uses a single equals sign for assignment.",
    explanation: "The single `=` assigns 10; use `score == 10` to compare for equality.",
  },
  {
    id: "debug-condition-hard",
    level: 3,
    subject: "computer-science",
    concept: "Debugging conditions",
    prompt: "Which condition correctly checks that age is from 13 through 19 inclusive in C++?",
    options: ["age >= 13 && age <= 19", "age > 13 || age < 19", "age == 13 && age == 19", "age <= 13 && age >= 19"],
    answer: "age >= 13 && age <= 19",
    hint: "Both boundary checks must be true at the same time.",
    explanation: "The range includes both endpoints, so use age >= 13 and age <= 19 joined with logical AND.",
  },
  {
    id: "function-parameter-easy",
    level: 1,
    subject: "computer-science",
    concept: "Functions",
    prompt: "What is a function parameter used for?",
    options: ["To pass input into a function", "To end the program", "To store every array", "To repeat a loop"],
    answer: "To pass input into a function",
    hint: "A caller can provide values that the function uses.",
    explanation: "Parameters let a function receive input values from its caller.",
  },
  {
    id: "function-return-medium",
    level: 2,
    subject: "computer-science",
    concept: "Functions",
    prompt: "What does a `return` statement do in a value-returning function?",
    options: ["Sends a result back to the caller", "Starts a loop", "Declares a parameter", "Prints every variable"],
    answer: "Sends a result back to the caller",
    hint: "The caller can use the value produced by the function.",
    explanation: "A return statement provides the function's result to the code that called it.",
  },
  {
    id: "function-argument-hard",
    level: 3,
    subject: "computer-science",
    concept: "Functions",
    prompt: "Given `int doubleIt(int n) { return n * 2; }`, what does `doubleIt(6)` return?",
    options: ["6", "8", "12", "36"],
    answer: "12",
    hint: "Substitute 6 for n, then multiply by 2.",
    explanation: "The function returns n × 2, so doubleIt(6) returns 12.",
  },
  {
    id: "input-output-read-easy",
    level: 1,
    subject: "computer-science",
    concept: "Input and output",
    prompt: "Which C++ stream is commonly used to read keyboard input?",
    options: ["cout", "cin", "cerr", "clog"],
    answer: "cin",
    hint: "The input stream name begins with c and ends with in.",
    explanation: "`cin` reads input, commonly from the keyboard; `cout` writes output.",
  },
  {
    id: "input-output-read-medium",
    level: 2,
    subject: "computer-science",
    concept: "Input and output",
    prompt: "What operator sends a value to `cout` in C++?",
    options: ["<<", ">>", "==", "&&"],
    answer: "<<",
    hint: "The insertion operator points toward the output stream.",
    explanation: "The `<<` insertion operator sends output values to `cout`.",
  },
  {
    id: "input-output-format-hard",
    level: 3,
    subject: "computer-science",
    concept: "Input and output",
    prompt: "What is printed by `cout << \"Town \" << 3;`?",
    options: ["Town 3", "3 Town", "TownTownTown", "A compile error"],
    answer: "Town 3",
    hint: "The stream outputs each part from left to right.",
    explanation: "The string `Town ` is printed first, followed by the number 3.",
  },
  {
    id: "loop-for-count-hard",
    level: 3,
    subject: "computer-science",
    concept: "Loops",
    prompt: "How many times does `for (int i = 1; i <= 4; i++)` run?",
    options: ["3", "4", "5", "It never runs"],
    answer: "4",
    hint: "The values of i are 1, 2, 3 and 4.",
    explanation: "The loop runs for four values before i becomes 5 and the condition is false.",
    prerequisiteConcepts: ["Variables and data types"],
  },
  {
    id: "string-length-medium",
    level: 2,
    subject: "computer-science",
    concept: "Strings",
    prompt: "How many characters are in the string `\"STEM\"`?",
    options: ["3", "4", "5", "6"],
    answer: "4",
    hint: "Count each character between the quotation marks.",
    explanation: "S, T, E and M make four characters.",
  },
  {
    id: "string-concatenate-hard",
    level: 3,
    subject: "computer-science",
    concept: "Strings",
    prompt: "If `first` is `\"Bright\"` and `last` is `\"Bridge\"`, what is `first + last`?",
    options: ["Bright Bridge", "BrightBridge", "BridgeBright", "Bright+last"],
    answer: "BrightBridge",
    hint: "String concatenation joins the exact contents; no space is added automatically.",
    explanation: "Adding the two strings joins them directly, producing BrightBridge.",
  },
  {
    id: "variable-integer-medium",
    level: 2,
    subject: "computer-science",
    concept: "Variables and data types",
    prompt: "Which C++ type is suitable for storing the whole number 42?",
    options: ["int", "bool", "char", "void"],
    answer: "int",
    hint: "Choose the common type for integer values.",
    explanation: "`int` stores whole-number values such as 42.",
  },
  {
    id: "variable-double-hard",
    level: 3,
    subject: "computer-science",
    concept: "Variables and data types",
    prompt: "Which type best preserves the fractional value 3.75 in C++?",
    options: ["int", "double", "bool", "char"],
    answer: "double",
    hint: "Choose a floating-point type rather than a whole-number type.",
    explanation: "`double` can store fractional numeric values such as 3.75.",
  },
  {
    id: "function-reuse-easy",
    level: 1,
    subject: "computer-science",
    concept: "Functions",
    prompt: "Why might a programmer put a repeated calculation in a function?",
    options: [
      "To reuse the same instructions without rewriting them",
      "To make the calculation impossible to call",
      "To turn every value into text",
      "To stop the program from running",
    ],
    answer: "To reuse the same instructions without rewriting them",
    hint: "Functions can be called from more than one place.",
    explanation: "A function packages reusable instructions so the program can call them wherever needed.",
  },
  {
    id: "debug-condition-medium-range",
    level: 2,
    subject: "computer-science",
    concept: "Debugging conditions",
    prompt: "What values make `n % 2 == 0` true?",
    options: ["Even integers", "Odd integers", "Negative values only", "All decimal values"],
    answer: "Even integers",
    hint: "The remainder after dividing an even integer by 2 is zero.",
    explanation: "An even integer is divisible by 2 with remainder 0, so the condition is true.",
  },
  {
    id: "bonding-electron-transfer-medium",
    level: 2,
    subject: "chemistry",
    concept: "Chemical bonding",
    prompt: "In ionic bonding, what happens to electrons between the atoms?",
    options: ["They are transferred from one atom to another", "They turn into protons", "They are shared equally in every bond", "They disappear"],
    answer: "They are transferred from one atom to another",
    hint: "The transfer creates oppositely charged ions.",
    explanation: "Ionic bonding forms when electrons transfer, producing positive and negative ions that attract.",
  },
  {
    id: "periodic-groups-medium",
    level: 2,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "Elements in the same periodic-table group often have similar chemical properties because they have the same number of what?",
    options: ["Outer-shell electrons", "Neutrons", "Nuclei", "Isotopes"],
    answer: "Outer-shell electrons",
    hint: "These electrons are involved in chemical reactions and bonding.",
    explanation: "Elements in a group generally have the same number of outer-shell electrons, leading to similar chemical behaviour.",
  },
  {
    id: "symbol-calcium-hard",
    level: 3,
    subject: "chemistry",
    concept: "Periodic table",
    prompt: "Which element has the symbol Ca?",
    options: ["Carbon", "Calcium", "Cadmium", "Cobalt"],
    answer: "Calcium",
    hint: "It is a common metal in bones and limestone.",
    explanation: "Ca is the chemical symbol for calcium.",
  },
];

const CONCEPT_ID_OVERRIDES: Record<string, string> = {
  "mathematics:Linear equations": "linear_equations",
  "mathematics:Arithmetic": "arithmetic",
  "mathematics:Fractions": "fractions",
  "mathematics:Area": "area",
  "chemistry:Atoms": "atomic_structure",
  "chemistry:Periodic table": "periodic_table",
  "physics:Ohm's law": "ohms_law",
  "physics:Series circuits": "series_circuits",
  "computer-science:Variables and data types": "variables",
  "computer-science:Input and output": "input_output",
  "computer-science:Conditional statements": "conditionals",
  "computer-science:Loops": "loops",
};

const SUBATOMIC_PARTICLE_QUESTION_IDS = new Set([
  "atom-layout",
  "atom-electron",
  "atom-electrons-easy",
  "atom-charge-match-medium",
  "atom-neutral-particle-medium",
  "atom-charge-count-hard",
  "atom-charge-change-hard",
]);
const CHEMICAL_SYMBOL_QUESTION_IDS = new Set([
  "periodic-symbol-oxygen",
  "periodic-symbol-na",
  "symbol-hydrogen-easy",
  "symbol-chlorine-medium",
  "symbol-iron-medium",
  "symbol-copper-hard",
  "symbol-calcium-hard",
]);

function getStableConceptId(question: QuestionSeed): string {
  if (SUBATOMIC_PARTICLE_QUESTION_IDS.has(question.id)) return "subatomic_particles";
  if (CHEMICAL_SYMBOL_QUESTION_IDS.has(question.id)) return "chemical_symbols";
  if (question.id.startsWith("periodic-atomic-number") || question.id.startsWith("atomic-number-")) {
    return "atomic_number";
  }
  return CONCEPT_ID_OVERRIDES[`${question.subject}:${question.concept}`]
    ?? `${question.subject.replace(/-/g, "_")}_${question.concept.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

const QUESTION_CONCEPT_IDS = new Map(
  QUESTION_SEEDS.map((question) => [question.id, getStableConceptId(question)]),
);

export const QUESTIONS: PhysicsQuestion[] = QUESTION_SEEDS.map((question) => ({
  ...question,
  conceptId: getStableConceptId(question),
  difficulty: question.level === 1 ? "easy" : question.level === 2 ? "medium" : "hard",
  ...(question.prerequisiteConcepts
    ? {
        prerequisiteConceptIds: question.prerequisiteConcepts.flatMap((prerequisite) => {
          const prerequisiteQuestion = QUESTION_SEEDS.find(
            (candidate) =>
              candidate.subject === question.subject &&
              candidate.concept === prerequisite,
          );
          const prerequisiteId = prerequisiteQuestion
            ? QUESTION_CONCEPT_IDS.get(prerequisiteQuestion.id)
            : undefined;
          return prerequisiteId ? [prerequisiteId] : [];
        }),
      }
    : {}),
}));

function createConceptStats(): ConceptStats {
  return {
    attempts: 0,
    correct: 0,
    incorrect: 0,
    struggles: 0,
    recentPerformance: [],
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    mastery: 0,
    difficulty: 1,
    difficultyStats: {
      1: { attempted: 0, correct: 0, incorrect: 0 },
      2: { attempted: 0, correct: 0, incorrect: 0 },
      3: { attempted: 0, correct: 0, incorrect: 0 },
    },
    mastered: false,
    hints: 0,
    remedialAttempts: 0,
    retryAttempts: 0,
    questionAttempts: {},
    needsRemedial: false,
    lastQuestionId: null,
    lastQuestionLevel: 1,
  };
}

function updateConceptStats(
  stats: SubjectStats,
  question: PhysicsQuestion,
  correct: boolean,
  options: { retry: boolean; remedial: boolean },
): SubjectStats {
  const current = stats.concepts[question.conceptId] ?? createConceptStats();
  const level = clampDifficulty(question.level) as 1 | 2 | 3;
  const questionAttempts = {
    ...current.questionAttempts,
    [question.id]: (current.questionAttempts[question.id] ?? 0) + 1,
  };
  const difficultyStats = {
    ...current.difficultyStats,
    [level]: {
      ...current.difficultyStats[level],
      attempted: current.difficultyStats[level].attempted + (options.retry ? 0 : 1),
      correct: current.difficultyStats[level].correct + (options.retry || !correct ? 0 : 1),
      incorrect: current.difficultyStats[level].incorrect + (options.retry || correct ? 0 : 1),
    },
  };
  const recentPerformance = [
    ...current.recentPerformance,
    options.retry ? "retry" : correct ? "correct" : "incorrect",
  ].slice(-RECENT_PERFORMANCE_LIMIT) as ConceptAnswerResult[];

  let nextConcept: ConceptStats;
  if (options.retry) {
    nextConcept = {
      ...current,
      questionAttempts,
      recentPerformance,
      consecutiveCorrect: 0,
      difficultyStats,
      retryAttempts: current.retryAttempts + 1,
      remedialAttempts: current.remedialAttempts + (options.remedial ? 1 : 0),
      needsRemedial: correct ? false : current.needsRemedial,
      lastQuestionId: question.id,
      lastQuestionLevel: question.level,
    };
  } else if (!correct) {
    const incorrectStreak = current.consecutiveIncorrect + 1;
    nextConcept = {
      ...current,
      questionAttempts,
      attempts: current.attempts + 1,
      incorrect: current.incorrect + 1,
      struggles: current.struggles + 1,
      recentPerformance,
      consecutiveCorrect: 0,
      consecutiveIncorrect: incorrectStreak,
      difficultyStats,
      mastery: calculateConceptMastery(
        current.correct,
        current.incorrect + 1,
        recentPerformance,
      ),
      difficulty: clampDifficulty(current.difficulty - 1),
      mastered: false,
      remedialAttempts: current.remedialAttempts + (options.remedial ? 1 : 0),
      needsRemedial: true,
      lastQuestionId: question.id,
      lastQuestionLevel: question.level,
    };
  } else {
    const correctStreak = question.level === current.difficulty
      ? current.consecutiveCorrect + 1
      : 0;
    const shouldAdvance = question.level === current.difficulty && correctStreak >= 2;
    const difficulty = shouldAdvance
      ? clampDifficulty(current.difficulty + 1)
      : current.difficulty;
    nextConcept = {
      ...current,
      questionAttempts,
      attempts: current.attempts + 1,
      correct: current.correct + 1,
      recentPerformance,
      consecutiveCorrect: shouldAdvance ? 0 : correctStreak,
      consecutiveIncorrect: 0,
      difficultyStats,
      mastery: calculateConceptMastery(
        current.correct + 1,
        current.incorrect,
        recentPerformance,
      ),
      difficulty,
      mastered:
        current.correct + 1 >= 4 &&
        calculateConceptMastery(
          current.correct + 1,
          current.incorrect,
          recentPerformance,
        ) >= 80,
      remedialAttempts: current.remedialAttempts + (options.remedial ? 1 : 0),
      needsRemedial: false,
      lastQuestionId: question.id,
      lastQuestionLevel: question.level,
    };
  }

  const concepts = { ...stats.concepts, [question.conceptId]: nextConcept };
  return { ...stats, ...summarizeSubjectConcepts(concepts), concepts };
}

function resolveWeakestSubject(progress: GameProgress): Subject {
  const ranked = (Object.keys(progress.subjectStats) as Subject[]).sort(
    (left, right) => progress.subjectStats[left].mastery - progress.subjectStats[right].mastery,
  );
  return ranked[0] ?? "physics";
}

export function getTownBuildingState(progress: GameProgress, buildingId: BuildingId): BuildingStatus {
  const state = progress.townBuildings[buildingId];
  if (state?.completed) return "completed";

  const definition = BUILDING_DEFINITIONS[buildingId];
  if (buildingId === "power-station") {
    return progress.rewardEvents.includes("mission-complete:power-station") ? "completed" : "available";
  }

  if (buildingId === "workshop" && progress.builtWorkshop) return "completed";

  const meetsRequirements =
    progress.coins >= (definition.requirements.coins ?? 0) &&
    progress.xp >= (definition.requirements.xp ?? 0) &&
    progress.materials >= (definition.requirements.materials ?? 0) &&
    progress.repair >= (definition.requirements.repair ?? 0) &&
    (definition.requirements.buildingIds?.every((item) => getTownBuildingState(progress, item) === "completed") ?? true) &&
    (definition.requirements.subject
      ? progress.subjectStats[definition.requirements.subject].mastery >= (definition.requirements.mastery ?? 0)
      : true) &&
    (definition.requirements.rewardEvent
      ? progress.rewardEvents.includes(definition.requirements.rewardEvent)
      : true);

  return meetsRequirements ? "available" : "locked";
}

export function getVisibleTownBuildings(progress: GameProgress) {
  return (Object.keys(BUILDING_DEFINITIONS) as BuildingId[]).map((buildingId) => ({
    ...BUILDING_DEFINITIONS[buildingId],
    id: buildingId,
    status: getTownBuildingState(progress, buildingId),
  }));
}

export type QuestionSelection = {
  question: PhysicsQuestion;
  mode: "new" | "remedial" | "retry";
};

function getLastQuestionForSubject(progress: GameProgress, subject: Subject): string | undefined {
  return [...progress.answered].reverse().find(
    (id) => QUESTIONS.some((question) => question.id === id && question.subject === subject),
  );
}

function getUnseenQuestionSelection(
  progress: GameProgress,
  subject: Subject,
  previousQuestionId?: string,
  displayedQuestionIds: string[] = [],
  targetConceptId?: string,
): QuestionSelection | null {
  const subjectStats = progress.subjectStats[subject];
  const unseen = QUESTIONS.filter(
    (question) =>
      question.subject === subject &&
      !progress.answered.includes(question.id) &&
      question.id !== previousQuestionId &&
      !displayedQuestionIds.includes(question.id),
  );
  if (unseen.length === 0) return null;

  if (targetConceptId) {
    const targetStats = subjectStats.concepts[targetConceptId];
    const targetQuestions = unseen.filter((question) => question.conceptId === targetConceptId);
    if (targetStats?.needsRemedial) {
      const failedQuestion = QUESTIONS.find((question) => question.id === targetStats.lastQuestionId);
      const easierQuestion = targetQuestions
        .filter((question) => question.level < targetStats.lastQuestionLevel)
        .sort((left, right) => right.level - left.level || left.id.localeCompare(right.id))[0];
      if (easierQuestion) return { question: easierQuestion, mode: "remedial" };

      if (targetStats.consecutiveIncorrect >= 2) {
        const prerequisite = unseen
          .filter((question) => failedQuestion?.prerequisiteConceptIds?.includes(question.conceptId))
          .sort((left, right) => left.level - right.level || left.id.localeCompare(right.id))[0];
        if (prerequisite) return { question: prerequisite, mode: "remedial" };
      }

      const sameConceptAlternative = targetQuestions
        .filter((question) => question.level <= targetStats.difficulty)
        .sort((left, right) => left.level - right.level || left.id.localeCompare(right.id))[0];
      if (sameConceptAlternative) return { question: sameConceptAlternative, mode: "remedial" };

      const prerequisite = unseen
        .filter((question) => failedQuestion?.prerequisiteConceptIds?.includes(question.conceptId))
        .sort((left, right) => left.level - right.level || left.id.localeCompare(right.id))[0];
      return prerequisite ? { question: prerequisite, mode: "remedial" } : null;
    }

    const difficulty = targetStats?.difficulty ?? 1;
    const targetQuestion = targetQuestions
      .filter((question) => question.level <= difficulty)
      .sort((left, right) =>
        Math.abs(left.level - difficulty) - Math.abs(right.level - difficulty) ||
        left.id.localeCompare(right.id),
      )[0];
    return targetQuestion ? { question: targetQuestion, mode: "new" } : null;
  }

  const pendingRemediation = Object.entries(subjectStats.concepts)
    .filter(([conceptId, stats]) => conceptId !== LEGACY_CONCEPT_KEY && stats.needsRemedial)
    .sort(([, left], [, right]) => {
      const leftOrder = progress.answered.indexOf(left.lastQuestionId ?? "");
      const rightOrder = progress.answered.indexOf(right.lastQuestionId ?? "");
      return rightOrder - leftOrder || right.consecutiveIncorrect - left.consecutiveIncorrect;
    });

  if (pendingRemediation[0]) {
    const [targetConceptId, stats] = pendingRemediation[0];
    const failedQuestion = QUESTIONS.find((question) => question.id === stats.lastQuestionId);
    const sameConcept = unseen.filter((question) => question.conceptId === targetConceptId);
    const easierSameConcept = sameConcept
      .filter((question) => question.level < stats.lastQuestionLevel)
      .sort((left, right) => right.level - left.level);
    if (easierSameConcept[0]) return { question: easierSameConcept[0], mode: "remedial" };

    if (stats.consecutiveIncorrect >= 2 || sameConcept.length === 0) {
      const prerequisites = unseen
        .filter((question) =>
          failedQuestion?.prerequisiteConceptIds?.includes(question.conceptId),
        )
        .sort((left, right) => left.level - right.level);
      if (prerequisites[0]) return { question: prerequisites[0], mode: "remedial" };
    }

    const sameConceptAlternative = sameConcept
      .filter((question) => question.level <= stats.difficulty)
      .sort((left, right) => left.level - right.level);
    if (sameConceptAlternative[0]) {
      return { question: sameConceptAlternative[0], mode: "remedial" };
    }

    const prerequisite = unseen.find((question) =>
      failedQuestion?.prerequisiteConceptIds?.includes(question.conceptId),
    );
    return prerequisite ? { question: prerequisite, mode: "remedial" } : null;
  }

  const lastQuestion = [...progress.answered].reverse().flatMap((id) => {
    const question = QUESTIONS.find((candidate) => candidate.id === id && candidate.subject === subject);
    return question ? [question] : [];
  })[0];
  const focusedConceptId = lastQuestion?.conceptId;
  const focusedStats = focusedConceptId ? subjectStats.concepts[focusedConceptId] : undefined;

  if (focusedConceptId && focusedStats) {
    const focusedQuestion = unseen
      .filter((question) =>
        question.conceptId === focusedConceptId &&
        question.level <= focusedStats.difficulty,
      )
      .sort((left, right) =>
        Math.abs(left.level - focusedStats.difficulty) - Math.abs(right.level - focusedStats.difficulty),
      )[0];
    if (focusedQuestion) return { question: focusedQuestion, mode: "new" };
  }

  if (focusedConceptId && focusedStats?.mastered) {
    const relatedQuestions = unseen
      .filter((question) =>
        question.prerequisiteConceptIds?.includes(focusedConceptId),
      )
      .sort((left, right) => left.level - right.level);
    if (relatedQuestions[0]) return { question: relatedQuestions[0], mode: "new" };
  }

  const selectable = unseen.filter((question) =>
    question.level <= (subjectStats.concepts[question.conceptId]?.difficulty ?? 1),
  );
  const sorted = [...selectable].sort((left, right) =>
    left.level - right.level || left.id.localeCompare(right.id),
  );
  return sorted[0] ? { question: sorted[0], mode: "new" } : null;
}

export function getNextQuestionSelection(
  progress: GameProgress,
  subject: Subject,
  previousQuestionId?: string,
  displayedQuestionIds: string[] = [],
  targetConceptId?: string,
): QuestionSelection | null {
  return getUnseenQuestionSelection(
    progress,
    subject,
    previousQuestionId ?? getLastQuestionForSubject(progress, subject),
    displayedQuestionIds,
    targetConceptId,
  );
}

export function getNextQuestion(
  progress: GameProgress,
  preferredSubject?: Subject,
  previousQuestionId?: string,
): PhysicsQuestion | null {
  const subject = preferredSubject ?? resolveWeakestSubject(progress);
  return getNextQuestionSelection(progress, subject, previousQuestionId)?.question ?? null;
}

export function getNextUnseenQuestion(
  progress: GameProgress,
  subject: Subject,
  previousQuestionId?: string,
): PhysicsQuestion | null {
  return getNextQuestionSelection(progress, subject, previousQuestionId)?.question ?? null;
}

export function getQuestionForRetry(
  progress: GameProgress,
  subject: Subject,
  previousQuestionId?: string,
): PhysicsQuestion | null {
  const missed = [...progress.answered].reverse().flatMap((id) => {
    const question = QUESTIONS.find((item) => item.id === id && item.subject === subject);
    return question && !progress.rewardEvents.includes(`reward:${question.id}`) ? [question] : [];
  });
  return missed.find((question) => question.id !== previousQuestionId) ?? missed[0] ?? null;
}

export function recordQuestionHint(progress: GameProgress, question: PhysicsQuestion): GameProgress {
  const subjectStats = progress.subjectStats[question.subject];
  const current = subjectStats.concepts[question.conceptId] ?? createConceptStats();
  const concepts = {
    ...subjectStats.concepts,
    [question.conceptId]: { ...current, hints: current.hints + 1 },
  };
  return {
    ...progress,
    subjectStats: {
      ...progress.subjectStats,
      [question.subject]: { ...subjectStats, ...summarizeSubjectConcepts(concepts), concepts },
    },
  };
}

export const SUBJECT_QUIZ_QUESTION_COUNT = 3;
export const MATHS_QUIZ_QUESTION_COUNT = SUBJECT_QUIZ_QUESTION_COUNT;
export const SUBJECT_QUIZ_COMPLETION_REWARD = { coins: 35, xp: 40, materials: 2 } as const;
export const MATHS_QUIZ_COMPLETION_REWARD = SUBJECT_QUIZ_COMPLETION_REWARD;

export function getSubjectQuizCompletionEvent(subject: Subject): string | null {
  return subject === "physics" ? null : `quiz-complete:${subject}`;
}

export function getCompletedSubjectQuestionCount(progress: GameProgress, subject: Subject): number {
  return new Set(
    progress.rewardEvents
      .filter((event) => event.startsWith("reward:"))
      .map((event) => event.slice("reward:".length))
      .filter((id) => QUESTIONS.some((question) => question.id === id && question.subject === subject)),
  ).size;
}

export function completeSubjectQuiz(progress: GameProgress, subject: Subject): GameProgress {
  const completionEvent = getSubjectQuizCompletionEvent(subject);
  if (!completionEvent) return progress;
  if (progress.rewardEvents.includes(completionEvent)) return progress;

  if (getCompletedSubjectQuestionCount(progress, subject) < SUBJECT_QUIZ_QUESTION_COUNT) return progress;

  const totalXp = progress.xp + SUBJECT_QUIZ_COMPLETION_REWARD.xp;
  return {
    ...progress,
    coins: progress.coins + SUBJECT_QUIZ_COMPLETION_REWARD.coins,
    xp: totalXp,
    level: Math.max(progress.level, Math.floor(totalXp / 100) + 1),
    materials: progress.materials + SUBJECT_QUIZ_COMPLETION_REWARD.materials,
    rewardEvents: [...progress.rewardEvents, completionEvent],
  };
}

export function completeMathsQuiz(progress: GameProgress): GameProgress {
  return completeSubjectQuiz(progress, "mathematics");
}

export function answerQuestion(
  progress: GameProgress,
  question: PhysicsQuestion,
  answer: string,
  options: { retry?: boolean; remedial?: boolean } = {},
): { progress: GameProgress; correct: boolean; reward: number } {
  const correct = answer === question.answer;
  const subject = question.subject;
  const rewardKey = `reward:${question.id}`;
  const alreadyRewarded = progress.rewardEvents.includes(rewardKey);
  const isRetry = options.retry === true || progress.answered.includes(question.id);
  const nextSubjectStats = {
    ...progress.subjectStats,
    [subject]: updateConceptStats(
      progress.subjectStats[subject],
      question,
      correct,
      { retry: isRetry, remedial: options.remedial === true },
    ),
  };

  if (!correct) {
    return {
      progress: {
        ...progress,
        streak: isRetry ? progress.streak : 0,
        misses: progress.misses + 1,
        answered: [...new Set([...progress.answered, question.id])],
        subjectStats: nextSubjectStats,
      },
      correct: false,
      reward: 0,
    };
  }

  const nextStreak = isRetry ? progress.streak : progress.streak + 1;
  const nextLevel = nextStreak >= 2 ? Math.min(3, progress.level + 1) : progress.level;
  const totalXp = progress.xp + (alreadyRewarded ? 0 : 20);
  const awardsPhysicsMaterials = subject === "physics";

  const nextProgress: GameProgress = {
    ...progress,
    coins: progress.coins + (alreadyRewarded ? 0 : 25),
    xp: totalXp,
    wire: progress.wire + (alreadyRewarded && awardsPhysicsMaterials ? 0 : awardsPhysicsMaterials ? 1 : 0),
    repair: Math.min(100, progress.repair + (alreadyRewarded && awardsPhysicsMaterials ? 0 : awardsPhysicsMaterials ? 25 : 0)),
    level: Math.max(nextLevel, Math.floor(totalXp / 100) + 1),
    streak: nextStreak,
    materials: progress.materials + (alreadyRewarded ? 0 : 1),
    answered: [...new Set([...progress.answered, question.id])],
    rewardEvents: alreadyRewarded ? progress.rewardEvents : [...progress.rewardEvents, rewardKey],
    subjectStats: nextSubjectStats,
  };

  return {
    progress: nextProgress,
    correct: true,
    reward: alreadyRewarded ? 0 : 25,
  };
}

export function repairPowerStation(progress: GameProgress): GameProgress | null {
  const completionEvent = "mission-complete:power-station";
  if (progress.repair < 100 || progress.rewardEvents.includes(completionEvent)) return null;
  const totalXp = progress.xp + BUILDING_DEFINITIONS["power-station"].reward.xp;
  return {
    ...progress,
    coins: progress.coins + BUILDING_DEFINITIONS["power-station"].reward.coins,
    xp: totalXp,
    level: Math.max(progress.level, Math.floor(totalXp / 100) + 1),
    materials: progress.materials + BUILDING_DEFINITIONS["power-station"].reward.materials,
    plotsUnlocked: progress.plotsUnlocked + 1,
    rewardEvents: [...progress.rewardEvents, completionEvent],
    townBuildings: {
      ...progress.townBuildings,
      "power-station": {
        ...progress.townBuildings["power-station"],
        completed: true,
        status: "completed",
      },
    },
  };
}

export function purchaseBuilding(progress: GameProgress, buildingId: BuildingId): GameProgress | null {
  const definition = BUILDING_DEFINITIONS[buildingId];
  const status = getTownBuildingState(progress, buildingId);

  if (buildingId === "power-station") return null;
  if (status === "completed" || status === "locked") return null;
  if (progress.coins < definition.cost || progress.materials < definition.materials) return null;

  const nextProgress: GameProgress = {
    ...progress,
    coins: progress.coins - definition.cost,
    materials: progress.materials - definition.materials,
    xp: progress.xp + definition.reward.xp,
    level: Math.max(
      progress.level,
      Math.floor((progress.xp + definition.reward.xp) / 100) + 1,
    ),
    plotsUnlocked: progress.plotsUnlocked + 1,
    townBuildings: {
      ...progress.townBuildings,
      [buildingId]: {
        ...progress.townBuildings[buildingId],
        completed: true,
        status: "completed",
      },
    },
  };

  if (buildingId === "workshop") {
    nextProgress.builtWorkshop = true;
  }

  return nextProgress;
}

export function buildWorkshop(progress: GameProgress): GameProgress | null {
  if (progress.builtWorkshop || progress.coins < WORKSHOP_COST) return null;
  return {
    ...progress,
    coins: progress.coins - WORKSHOP_COST,
    builtWorkshop: true,
    townBuildings: {
      ...progress.townBuildings,
      workshop: {
        ...progress.townBuildings.workshop,
        completed: true,
        status: "completed",
      },
    },
  };
}