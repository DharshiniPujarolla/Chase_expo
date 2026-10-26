import { createFileRoute } from "@tanstack/react-router";

import { MAX_STEM_BUDDY_REQUEST_BYTES, validateStemBuddyRequest } from "@/lib/stem-buddy-api";
import { GEMINI_MODEL, requestGeminiAnswer } from "@/lib/stem-buddy-gemini";

function jsonResponse(status: number, body: unknown): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function readRequestBody(
  request: Request,
): Promise<{ ok: true; text: string } | { ok: false; status: 400 | 413; message: string }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      return { ok: false, status: 400, message: "Request size is invalid." };
    }
    if (declaredLength > MAX_STEM_BUDDY_REQUEST_BYTES) {
      return {
        ok: false,
        status: 413,
        message: "Request is too large. Shorten the conversation and try again.",
      };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, message: "Request body is missing." };

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      byteLength += part.value.byteLength;
      if (byteLength > MAX_STEM_BUDDY_REQUEST_BYTES) {
        await reader.cancel();
        return {
          ok: false,
          status: 413,
          message: "Request is too large. Shorten the conversation and try again.",
        };
      }
      chunks.push(part.value);
    }
  } catch {
    return { ok: false, status: 400, message: "Request body could not be read." };
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(bytes) };
}

export const Route = createFileRoute("/api/stem-buddy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
          return jsonResponse(415, {
            error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Send a JSON request." },
          });
        }

        const body = await readRequestBody(request);
        if (!body.ok) {
          return jsonResponse(body.status, {
            error: {
              code: body.status === 413 ? "REQUEST_TOO_LARGE" : "INVALID_REQUEST",
              message: body.message,
            },
          });
        }

        let payload: unknown;
        try {
          payload = JSON.parse(body.text);
        } catch {
          return jsonResponse(400, {
            error: { code: "INVALID_JSON", message: "Request body must contain valid JSON." },
          });
        }

        const validation = validateStemBuddyRequest(payload);
        if (!validation.ok) {
          return jsonResponse(400, {
            error: { code: "INVALID_REQUEST", message: validation.message },
          });
        }

        const apiKey = process.env.GEMINI_API_KEY?.trim();
        if (!apiKey) {
          console.warn("[Stem Buddy] Gemini is not configured: GEMINI_API_KEY is missing.");
          return jsonResponse(503, {
            error: {
              code: "AI_PROVIDER_NOT_CONFIGURED",
              message: "Gemini is selected, but GEMINI_API_KEY is missing from the server environment.",
            },
          });
        }

        const answer = await requestGeminiAnswer(validation.value, apiKey);
        if (!answer.ok) {
          console.error("[Stem Buddy] Gemini request failed.", {
            code: answer.code,
            status: answer.status,
            model: GEMINI_MODEL,
            attempts: answer.attempts,
            elapsedMs: answer.elapsedMs,
            upstreamStatus: answer.upstreamStatus,
            upstreamCode: answer.upstreamCode,
            upstreamMessage: answer.diagnostic,
          });
          return jsonResponse(answer.status, {
            error: { code: answer.code, message: answer.message },
          });
        }

        return jsonResponse(200, { answer: answer.answer });
      },
    },
  },
});
