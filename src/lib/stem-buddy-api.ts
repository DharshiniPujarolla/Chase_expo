import type { Subject } from "@/lib/chase-game";

export const MAX_STEM_BUDDY_REQUEST_BYTES = 8_192;
export const MAX_STEM_BUDDY_MESSAGES = 12;
export const MAX_STEM_BUDDY_HISTORY_MESSAGES = 8;
export const MAX_STEM_BUDDY_MESSAGE_LENGTH = 1_000;
export const MAX_STEM_BUDDY_CONTEXT_LENGTH = 4_000;

export type StemBuddyApiMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StemBuddyIntent = "hint" | "explanation" | "practice";

export type StemBuddyApiRequest = {
  messages: StemBuddyApiMessage[];
  context: {
    subject: Subject;
    concept?: string;
    intent: StemBuddyIntent;
    mastery?: number;
    attempts?: number;
    activeQuestionHint?: string;
  };
};

export type StemBuddyRequestValidation =
  { ok: true; value: StemBuddyApiRequest } | { ok: false; message: string };

const subjects: Subject[] = ["physics", "mathematics", "chemistry", "computer-science"];
const intents: StemBuddyIntent[] = ["hint", "explanation", "practice"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSubject(value: unknown): value is Subject {
  return typeof value === "string" && subjects.some((subject) => subject === value);
}

function isIntent(value: unknown): value is StemBuddyIntent {
  return typeof value === "string" && intents.some((intent) => intent === value);
}

function isBoundedNumber(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum
  );
}

export function validateStemBuddyRequest(value: unknown): StemBuddyRequestValidation {
  if (!isRecord(value) || !Array.isArray(value.messages) || !isRecord(value.context)) {
    return { ok: false, message: "Send a conversation and learning context." };
  }

  const rawMessages = value.messages;
  if (rawMessages.length === 0 || rawMessages.length > MAX_STEM_BUDDY_MESSAGES) {
    return {
      ok: false,
      message: `Conversation history must contain 1 to ${MAX_STEM_BUDDY_MESSAGES} messages.`,
    };
  }

  const messages: StemBuddyApiMessage[] = [];
  let totalCharacters = 0;
  for (const entry of rawMessages) {
    if (
      !isRecord(entry) ||
      (entry.role !== "user" && entry.role !== "assistant") ||
      typeof entry.content !== "string"
    ) {
      return { ok: false, message: "Conversation messages have an invalid format." };
    }
    const content = entry.content.trim();
    if (!content || content.length > MAX_STEM_BUDDY_MESSAGE_LENGTH) {
      return {
        ok: false,
        message: `Each message must contain 1 to ${MAX_STEM_BUDDY_MESSAGE_LENGTH} characters.`,
      };
    }
    totalCharacters += content.length;
    if (totalCharacters > MAX_STEM_BUDDY_CONTEXT_LENGTH) {
      return {
        ok: false,
        message: "Conversation history is too long. Start a new chat to continue.",
      };
    }
    messages.push({ role: entry.role, content });
  }

  if (messages.at(-1)?.role !== "user") {
    return { ok: false, message: "The latest conversation message must be from the student." };
  }

  const context = value.context;
  if (!isSubject(context.subject)) {
    return { ok: false, message: "Choose a valid STEM subject." };
  }

  const intent = context.intent === undefined ? "explanation" : context.intent;
  if (!isIntent(intent)) {
    return { ok: false, message: "Choose a valid tutoring request type." };
  }

  const concept = context.concept;
  if (concept !== undefined && (typeof concept !== "string" || concept.length > 100)) {
    return { ok: false, message: "The learning concept is too long." };
  }

  const activeQuestionHint = context.activeQuestionHint;
  if (
    activeQuestionHint !== undefined &&
    (typeof activeQuestionHint !== "string" || activeQuestionHint.length > 300)
  ) {
    return { ok: false, message: "The active question hint is too long." };
  }

  const mastery = context.mastery;
  if (mastery !== undefined && !isBoundedNumber(mastery, 0, 100)) {
    return { ok: false, message: "Mastery must be between 0 and 100." };
  }

  const attempts = context.attempts;
  if (attempts !== undefined && !isBoundedNumber(attempts, 0, 10_000)) {
    return { ok: false, message: "Attempt count is invalid." };
  }

  return {
    ok: true,
    value: {
      messages: messages.slice(-MAX_STEM_BUDDY_HISTORY_MESSAGES),
      context: {
        subject: context.subject,
        intent,
        ...(concept === undefined ? {} : { concept: concept.trim() }),
        ...(mastery === undefined ? {} : { mastery }),
        ...(attempts === undefined ? {} : { attempts }),
        ...(activeQuestionHint === undefined
          ? {}
          : { activeQuestionHint: activeQuestionHint.trim() }),
      },
    },
  };
}
