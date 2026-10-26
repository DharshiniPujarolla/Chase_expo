import { describe, expect, it } from "vitest";

import type { StemBuddyApiRequest } from "@/lib/stem-buddy-api";
import {
  createGeminiPayload,
  extractGeminiAnswer,
  GEMINI_MAX_ATTEMPTS,
  GEMINI_MODEL,
  GEMINI_REQUEST_TIMEOUT_MS,
  requestGeminiAnswer,
} from "@/lib/stem-buddy-gemini";

const request: StemBuddyApiRequest = {
  messages: [
    { role: "assistant", content: "Let's compare the pH with 7." },
    { role: "user", content: "Can I have another hint?" },
  ],
  context: {
    subject: "chemistry",
    concept: "Acids and bases",
    intent: "hint",
    mastery: 40,
    attempts: 2,
    activeQuestionHint: "A pH below 7 is acidic.",
  },
};

describe("Stem Buddy Gemini integration", () => {
  it("creates a private, stateless tutoring request with only the supplied context", () => {
    const payload = createGeminiPayload(request);
    const systemText = payload.systemInstruction.parts[0]?.text;
    const inputText = payload.contents[0]?.parts[0]?.text;

    expect(payload.generationConfig).toEqual({
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingBudget: 0 },
    });
    expect(systemText).toContain("do not reveal the answer");
    expect(inputText).toContain("Subject: chemistry");
    expect(inputText).toContain("Active quiz hint: A pH below 7 is acidic.");
    expect(inputText).toContain("Student: Can I have another hint?");
    expect(systemText).toContain("Follow the student's actual question");
    expect(inputText).not.toContain("answer key");
  });

  it("extracts answer text from a generateContent response and ignores thought parts", () => {
    expect(extractGeminiAnswer({
      candidates: [{
        content: { parts: [{ text: "hidden", thought: true }, { text: "Force equals mass times acceleration." }] },
      }],
    })).toBe("Force equals mass times acceleration.");
    expect(extractGeminiAnswer({ candidates: [{ finishReason: "SAFETY" }] })).toBeNull();
  });

  it("extracts answer text from the Interactions API response", () => {
    expect(extractGeminiAnswer({ output_text: "  Try comparing it with 7.  " }))
      .toBe("Try comparing it with 7.");
    expect(extractGeminiAnswer({
      output: [{
        type: "model_output",
        content: [
          { type: "text", text: "First clue." },
          { type: "text", text: "Now try it." },
        ],
      }],
    })).toBe("First clue.\nNow try it.");
    expect(extractGeminiAnswer({ output: [{ type: "thought", text: "internal" }] })).toBeNull();
  });

  it("sends the API key only as a server-to-server header and returns Gemini's answer", async () => {
    let sentUrl = "";
    let sentInit: RequestInit | undefined;
    const fetcher: typeof fetch = async (input, init) => {
      sentUrl = String(input);
      sentInit = init;
      return Response.json({ output_text: "Consider which side of 7 pH 5 is on." });
    };

    const result = await requestGeminiAnswer(request, "test-secret", fetcher);

    expect(result).toEqual({
      ok: true,
      answer: "Consider which side of 7 pH 5 is on.",
    });
    expect(sentUrl).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    );
    expect(new Headers(sentInit?.headers).get("x-goog-api-key")).toBe("test-secret");
    expect(JSON.parse(String(sentInit?.body))).toMatchObject({
      generationConfig: { maxOutputTokens: 1024 },
    });
    expect(sentInit?.signal?.aborted).toBe(false);
  });

  it.each([
    [429, "AI_PROVIDER_RATE_LIMITED", true],
    [403, "AI_PROVIDER_AUTH_FAILED", false],
    [404, "AI_PROVIDER_MODEL_NOT_FOUND", false],
    [400, "AI_PROVIDER_REQUEST_REJECTED", false],
    [500, "AI_PROVIDER_ERROR", true],
    [504, "AI_PROVIDER_ERROR", true],
  ])("classifies Gemini HTTP %i and retries only transient statuses", async (status, code, retryable) => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return Response.json(
        { error: { status: "UPSTREAM_ERROR", message: "private upstream details test-secret" } },
        { status },
      );
    };

    const result = await requestGeminiAnswer(request, "test-secret", fetcher, {
      sleep: async () => {},
      random: () => 0,
    });

    expect(result).toMatchObject({ ok: false, status: status === 429 ? 429 : 502, code });
    expect(result).toMatchObject({
      attempts: retryable ? GEMINI_MAX_ATTEMPTS : 1,
      upstreamStatus: status,
      upstreamCode: "UPSTREAM_ERROR",
      diagnostic: "private upstream details [redacted]",
    });
    expect(calls).toBe(retryable ? GEMINI_MAX_ATTEMPTS : 1);
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });

  it("retries a transient provider failure once, then returns the generated answer", async () => {
    let calls = 0;
    const delays: number[] = [];
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return calls === 1
        ? Response.json({ error: { status: "UNAVAILABLE" } }, { status: 503 })
        : Response.json({ output_text: "Ohm's law is V = I × R." });
    };

    const result = await requestGeminiAnswer(request, "test-secret", fetcher, {
      sleep: async (milliseconds) => { delays.push(milliseconds); },
      random: () => 0,
    });

    expect(result).toEqual({ ok: true, answer: "Ohm's law is V = I × R." });
    expect(calls).toBe(2);
    expect(delays).toEqual([350]);
  });

  it("treats response-body reads as part of the timeout and retries a timeout only once", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async (_input, init) => {
      calls += 1;
      if (calls > 1) return Response.json({ output_text: "A = πr²." });
      const response = new Response();
      response.json = () => new Promise<unknown>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
          once: true,
        });
      });
      return response;
    };

    const result = await requestGeminiAnswer(request, "test-secret", fetcher, {
      timeoutMs: 5,
      sleep: async () => {},
      random: () => 0,
    });

    expect(result).toEqual({ ok: true, answer: "A = πr²." });
    expect(calls).toBe(GEMINI_MAX_ATTEMPTS);
    expect(GEMINI_REQUEST_TIMEOUT_MS).toBe(25_000);
  });

  it("returns timeout after the bounded retry limit and never returns a canned response", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async (_input, init) => {
      calls += 1;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
          once: true,
        });
      });
    };

    const result = await requestGeminiAnswer(request, "test-secret", fetcher, {
      timeoutMs: 5,
      sleep: async () => {},
      random: () => 0,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 504,
      code: "AI_PROVIDER_TIMEOUT",
      attempts: GEMINI_MAX_ATTEMPTS,
    });
    expect(calls).toBe(GEMINI_MAX_ATTEMPTS);
  });

  it("rejects a successful but unusable Gemini response instead of returning a success fallback", async () => {
    const fetcher: typeof fetch = async () => Response.json({ output: [] });

    const result = await requestGeminiAnswer(request, "test-secret", fetcher);

    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: "AI_PROVIDER_EMPTY_RESPONSE",
    });
  });
});