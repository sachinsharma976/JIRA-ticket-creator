import "server-only";
import { ApiError, GoogleGenAI, Type } from "@google/genai";
import { env } from "@/lib/env";
import { ticketDraftSchema, type IssueType, type TicketDraft } from "@/lib/types";

export class LlmError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "LlmError";
  }
}

// flash-lite is plenty for structured JSON extraction and has a much higher
// free-tier requests-per-minute quota than plain "flash" (which throttles at
// just 5 req/min on the free tier as of this writing). "-latest" tracks
// Google's current lite model so this doesn't need to be bumped by hand
// every time a pinned version (e.g. gemini-2.5-flash) is retired.
const MODEL = "gemini-flash-lite-latest";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Concise Jira ticket title, at most 100 characters.",
    },
    description: {
      type: Type.OBJECT,
      properties: {
        problem: { type: Type.STRING, description: "The specific problem or gap being addressed." },
        scope: { type: Type.STRING, description: "What is and isn't included in this ticket." },
      },
      required: ["problem", "scope"],
    },
    acceptanceCriteria: {
      type: Type.ARRAY,
      description: "3-7 testable acceptance criteria, each starting with a verb.",
      items: { type: Type.STRING },
    },
  },
  required: ["title", "description", "acceptanceCriteria"],
};

const SYSTEM_INSTRUCTION = `You are a senior product manager who writes clear, well-scoped Jira tickets.
Given free-form context from a teammate, produce a single structured ticket draft.

Rules:
- Title: at most 100 characters, specific, no ticket-type prefixes like "[Bug]".
- Description has two distinct parts: problem (what's wrong or missing, including why it matters) and scope (what this ticket does and does not cover).
- Do not invent specifics (numbers, names, systems) that aren't implied by the given context.
- Acceptance criteria: 3 to 7 items, each a short, independently testable statement starting with a verb (e.g. "Display an error message when...").
- Write for the issue type given (Task, Story, or Bug) — a Bug's acceptance criteria should describe the fixed/expected behavior.`;

function buildPrompt(context: string, issueType: IssueType) {
  return `Issue type: ${issueType}\n\nContext from the requester:\n"""\n${context}\n"""`;
}

// Free-tier Gemini flash models intermittently return 503 (over capacity) or
// 429 (rate limited) — both are worth a couple of short retries before
// surfacing an error, since a retry a few seconds later usually succeeds.
const RETRYABLE_STATUS_CODES = new Set([429, 503]);
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateTicketDraft(
  context: string,
  options: { issueType: IssueType },
): Promise<TicketDraft> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  let responseText: string | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: buildPrompt(context, options.issueType),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.4,
        },
      });
      responseText = response.text;
      break;
    } catch (cause) {
      const isRetryable = cause instanceof ApiError && RETRYABLE_STATUS_CODES.has(cause.status);
      console.error(`Gemini call failed (attempt ${attempt}/${MAX_ATTEMPTS})`, cause);
      if (!isRetryable || attempt === MAX_ATTEMPTS) {
        throw new LlmError("Failed to reach the AI model. Please try again.", cause);
      }
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  if (!responseText) {
    throw new LlmError("The AI model returned an empty response. Please try again.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(responseText);
  } catch (cause) {
    throw new LlmError("The AI model returned a response we couldn't parse. Please try again.", cause);
  }

  const parsed = ticketDraftSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new LlmError(
      "The AI model returned an unexpected format. Please try again.",
      parsed.error,
    );
  }

  return parsed.data;
}
