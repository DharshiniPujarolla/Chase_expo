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
};

export type PhysicsQuestion = {
  id: string;
  level: number;
  prompt: string;
  options: string[];
  answer: string;
  hint: string;
};

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
};

export const WORKSHOP_COST = 50;

export const QUESTIONS: PhysicsQuestion[] = [
  {
    id: "current",
    level: 1,
    prompt: "A circuit carries 2 amps of current through a 3-ohm resistor. What is the voltage?",
    options: ["1.5 volts", "6 volts", "5 volts", "0.6 volts"],
    answer: "6 volts",
    hint: "Ohm’s law: voltage = current × resistance.",
  },
  {
    id: "series",
    level: 1,
    prompt: "What happens to the other bulbs if one bulb breaks in a series circuit?",
    options: ["They all go out", "They get brighter", "Nothing changes", "They change color"],
    answer: "They all go out",
    hint: "A series circuit has only one path for electricity.",
  },
  {
    id: "resistance",
    level: 2,
    prompt: "A 12-volt battery pushes 3 amps through a circuit. What is its resistance?",
    options: ["36 ohms", "4 ohms", "9 ohms", "0.25 ohms"],
    answer: "4 ohms",
    hint: "Rearrange Ohm’s law: resistance = voltage ÷ current.",
  },
  {
    id: "parallel",
    level: 2,
    prompt: "Why can bulbs in a parallel circuit stay lit when another bulb is removed?",
    options: ["The battery doubles", "Each bulb has its own path", "Resistance becomes zero", "Current stops flowing"],
    answer: "Each bulb has its own path",
    hint: "Look for how many independent paths current can follow.",
  },
  {
    id: "power",
    level: 3,
    prompt: "A device uses 12 volts and draws 2 amps. How much electrical power does it use?",
    options: ["6 watts", "10 watts", "24 watts", "14 watts"],
    answer: "24 watts",
    hint: "Power = voltage × current. One volt-amp is one watt.",
  },
];

export function getNextQuestion(progress: GameProgress): PhysicsQuestion {
  const targetLevel = Math.min(
    3,
    Math.max(1, progress.misses >= 2 ? progress.level - 1 : progress.level),
  );
  const available = QUESTIONS.filter((question) => question.level <= targetLevel);
  const unseen = available.filter((question) => !progress.answered.includes(question.id));
  const pool = unseen.length > 0 ? unseen : available;
  const withoutLast = pool.filter((question) => question.id !== progress.answered.at(-1));
  return withoutLast[0] ?? pool[0] ?? QUESTIONS[0]!;
}

export function answerQuestion(
  progress: GameProgress,
  question: PhysicsQuestion,
  answer: string,
): { progress: GameProgress; correct: boolean; reward: number } {
  const correct = answer === question.answer;
  if (!correct) {
    return {
      progress: { ...progress, streak: 0, misses: progress.misses + 1 },
      correct: false,
      reward: 0,
    };
  }

  const nextStreak = progress.streak + 1;
  const nextLevel = nextStreak >= 2 ? Math.min(3, progress.level + 1) : progress.level;
  const totalXp = progress.xp + 20;

  return {
    progress: {
      ...progress,
      coins: progress.coins + 25,
      xp: totalXp,
      wire: progress.wire + 1,
      repair: Math.min(100, progress.repair + 25),
      level: Math.max(nextLevel, Math.floor(totalXp / 100) + 1),
      streak: nextStreak,
      answered: [...progress.answered, question.id],
    },
    correct: true,
    reward: 25,
  };
}

export function buildWorkshop(progress: GameProgress): GameProgress | null {
  if (progress.coins < WORKSHOP_COST || progress.builtWorkshop) return null;
  return {
    ...progress,
    coins: progress.coins - WORKSHOP_COST,
    builtWorkshop: true,
  };
}