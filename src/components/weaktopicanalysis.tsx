import { BookOpen, Check, ChevronRight } from "lucide-react";

import {
  getNextQuestionSelection,
  QUESTIONS,
  type GameProgress,
  type Subject,
} from "@/lib/chase-game";

type WeakTopicAnalysisProps = {
  progress: GameProgress;
  onPractice: (subject: Subject, conceptId: string) => void;
};

const SUBJECTS: { id: Subject; label: string }[] = [
  { id: "mathematics", label: "Mathematics" },
  { id: "physics", label: "Physics" },
  { id: "chemistry", label: "Chemistry" },
  { id: "computer-science", label: "Computer Science" },
];

type TopicStatus = "learning" | "practice" | "strong" | "mastered";

function getTopicStatus(
  stats: GameProgress["subjectStats"][Subject]["concepts"][string],
): TopicStatus {
  if (stats.mastered) return "mastered";
  if (
    stats.attempts >= 2 &&
    (stats.needsRemedial || stats.consecutiveIncorrect >= 2 || stats.mastery < 50)
  ) {
    return "practice";
  }
  if (stats.attempts >= 3 && stats.mastery >= 70) return "strong";
  return "learning";
}

function getStatusLabel(status: TopicStatus): string {
  switch (status) {
    case "practice":
      return "Needs practice";
    case "strong":
      return "Strong performance";
    case "mastered":
      return "Mastered";
    default:
      return "Learning in progress";
  }
}

export default function WeakTopicAnalysis({ progress, onPractice }: WeakTopicAnalysisProps) {
  const topics = SUBJECTS.flatMap(({ id: subject, label: subjectLabel }) =>
    Object.entries(progress.subjectStats[subject].concepts)
      .filter(([conceptId, stats]) => conceptId !== "__legacy_unattributed__" && stats.attempts > 0)
      .map(([conceptId, stats]) => {
        const question = QUESTIONS.find(
          (candidate) => candidate.subject === subject && candidate.conceptId === conceptId,
        );
        const nextSelection = question
          ? getNextQuestionSelection(progress, subject, undefined, [], conceptId)
          : null;
        return {
          subject,
          subjectLabel,
          conceptId,
          conceptLabel: question?.concept ?? conceptId.replaceAll("_", " "),
          stats,
          status: getTopicStatus(stats),
          nextSelection,
        };
      }),
  );

  const recommendation = [...topics]
    .filter((topic) => topic.status !== "mastered" && topic.nextSelection !== null)
    .sort((left, right) => {
      const statusOrder: Record<TopicStatus, number> = {
        practice: 0,
        learning: 1,
        strong: 2,
        mastered: 3,
      };
      return (
        statusOrder[left.status] - statusOrder[right.status] ||
        left.stats.mastery - right.stats.mastery ||
        right.stats.consecutiveIncorrect - left.stats.consecutiveIncorrect ||
        left.subjectLabel.localeCompare(right.subjectLabel) ||
        left.conceptLabel.localeCompare(right.conceptLabel)
      );
    })[0];

  const hasLearningData = topics.length > 0;
  const firstPhysicsQuestion = QUESTIONS.find((question) => question.subject === "physics");

  return (
    <section
      aria-labelledby="learning-analysis-title"
      className="mx-auto max-w-2xl space-y-5 rounded-2xl border bg-white p-6 text-gray-800 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-blue-600" />
        <div>
          <h2 id="learning-analysis-title" className="text-xl font-bold">
            Learning Analysis
          </h2>
          <p className="text-sm text-gray-500">
            {hasLearningData
              ? "Progress is based on your independent question attempts."
              : "Start a challenge to see progress for each STEM concept."}
          </p>
        </div>
      </div>

      {SUBJECTS.map(({ id: subject, label }) => {
        const subjectTopics = topics.filter((topic) => topic.subject === subject);
        return (
          <section key={subject} aria-label={`${label} learning progress`} className="space-y-3">
            <h3 className="font-semibold">{label}</h3>
            {subjectTopics.length === 0 ? (
              <p className="text-sm text-gray-500">No questions attempted yet.</p>
            ) : (
              subjectTopics.map((topic) => {
                const enoughEvidence = topic.stats.attempts >= 2;
                const color = topic.status === "practice" ? "bg-orange-500" : "bg-green-500";
                const questionAttempts = QUESTIONS
                  .filter(
                    (question) =>
                      question.subject === topic.subject &&
                      question.conceptId === topic.conceptId &&
                      topic.stats.questionAttempts[question.id] !== undefined,
                  )
                  .map((question) => ({
                    question,
                    attempts: topic.stats.questionAttempts[question.id]!,
                  }));
                return (
                  <div key={`${topic.subject}:${topic.conceptId}`} className="space-y-2">
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-medium">{topic.conceptLabel}</span>
                      <span>
                        {enoughEvidence
                          ? `${topic.stats.mastery}% mastery`
                          : "Not enough data yet"}
                      </span>
                    </div>
                    {enoughEvidence && (
                      <div
                        aria-label={`${topic.conceptLabel} mastery`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={topic.stats.mastery}
                        className="h-3 overflow-hidden rounded-full bg-gray-200"
                        role="progressbar"
                      >
                        <div
                          className={`h-full ${color}`}
                          style={{ width: `${topic.stats.mastery}%` }}
                        />
                      </div>
                    )}
                    <p className="text-sm text-gray-500">
                      {getStatusLabel(topic.status)} · {topic.stats.attempts} independent{" "}
                      {topic.stats.attempts === 1 ? "question" : "questions"} ·{" "}
                      {topic.stats.correct} correct · {topic.stats.incorrect} incorrect
                      {topic.stats.retryAttempts > 0 &&
                        ` · ${topic.stats.retryAttempts} ${topic.stats.retryAttempts === 1 ? "retry" : "retries"}`}
                    </p>
                    <details className="text-sm text-gray-500">
                      <summary className="cursor-pointer">
                        Attempts by question
                      </summary>
                      {questionAttempts.length > 0 ? (
                        <ul className="mt-1 list-inside list-disc">
                          {questionAttempts.map(({ question, attempts }) => (
                            <li key={question.id}>
                              {question.prompt} · {attempts}{" "}
                              {attempts === 1 ? "attempt" : "attempts"}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1">
                          Per-question attempt details were not recorded in this saved progress.
                        </p>
                      )}
                    </details>
                  </div>
                );
              })
            )}
          </section>
        );
      })}

      {!hasLearningData && firstPhysicsQuestion && (
        <button
          onClick={() => onPractice(firstPhysicsQuestion.subject, firstPhysicsQuestion.conceptId)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white"
        >
          Start a Physics challenge
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {hasLearningData && (
        <div className="rounded-lg bg-orange-50 p-4">
          <p className="font-bold">Recommended next practice</p>
          {recommendation ? (
            <>
              <p className="mt-1 text-sm">
                {recommendation.subjectLabel} · {recommendation.conceptLabel}
              </p>
              <p className="mt-1 text-sm">
                {recommendation.status === "practice"
                  ? `${recommendation.stats.incorrect} of ${recommendation.stats.attempts} independent questions were incorrect.`
                  : `${getStatusLabel(recommendation.status)} at difficulty ${recommendation.stats.difficulty}.`}
              </p>
              <p className="mt-1 text-sm">
                Next: {recommendation.nextSelection?.question.prompt}
                {recommendation.nextSelection?.question.conceptId !== recommendation.conceptId &&
                  ` (a prerequisite for ${recommendation.conceptLabel})`}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-green-700">
                <Check className="h-4 w-4" />
                Selected from your {recommendation.conceptLabel} progress and the existing question bank.
              </p>
              <button
                onClick={() => onPractice(recommendation.subject, recommendation.conceptId)}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
              >
                Practice {recommendation.conceptLabel}
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm">
              No unseen question is available for your attempted concepts or their listed
              prerequisites. Try another unlocked challenge; no unrelated topic is substituted.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
