import { describe, expect, it } from "vitest";

import { MAX_STEM_BUDDY_HISTORY_MESSAGES, validateStemBuddyRequest } from "@/lib/stem-buddy-api";

describe("Stem Buddy request validation", () => {
  it("accepts only bounded recent conversation with a student final message", () => {
    const messages = Array.from({ length: 9 }, (_, index) => ({
      role: index === 8 ? "user" : index % 2 === 0 ? "assistant" : "user",
      content: `Question ${index}`,
    }));
    const result = validateStemBuddyRequest({
      messages,
      context: {
        subject: "chemistry",
        concept: "Acids and bases",
        intent: "hint",
        mastery: 45,
        attempts: 4,
        activeQuestionHint: "Compare the pH value with 7.",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.messages).toHaveLength(MAX_STEM_BUDDY_HISTORY_MESSAGES);
    expect(result.value.messages[0]?.content).toBe("Question 1");
    expect(result.value.messages.at(-1)?.role).toBe("user");
    expect(result.value.context.subject).toBe("chemistry");
    expect(result.value.context.activeQuestionHint).toBe("Compare the pH value with 7.");
  });

  it.each([
    { messages: [], context: { subject: "physics" } },
    { messages: [{ role: "system", content: "secret prompt" }], context: { subject: "physics" } },
    {
      messages: [{ role: "assistant", content: "not the student's latest message" }],
      context: { subject: "physics" },
    },
    { messages: [{ role: "user", content: "hello" }], context: { subject: "astrology" } },
    { messages: [{ role: "user", content: "x".repeat(1_001) }], context: { subject: "physics" } },
    {
      messages: [{ role: "user", content: "hello" }],
      context: { subject: "physics", mastery: 101 },
    },
  ])("rejects invalid, excessive, or unsupported request data", (request) => {
    expect(validateStemBuddyRequest(request).ok).toBe(false);
  });

  it("does not accept an empty or oversized tutoring message", () => {
    expect(
      validateStemBuddyRequest({
        messages: [{ role: "user", content: "   " }],
        context: { subject: "mathematics" },
      }).ok,
    ).toBe(false);
  });
});
