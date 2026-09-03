import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JIRA_BASE_URL: z
    .string()
    .url("JIRA_BASE_URL must be a valid URL, e.g. https://your-domain.atlassian.net")
    .transform((url) => url.replace(/\/+$/, "")),
  JIRA_EMAIL: z.string().email("JIRA_EMAIL must be a valid email address"),
  JIRA_API_TOKEN: z.string().min(1, "JIRA_API_TOKEN is required"),
  JIRA_PROJECT_KEY: z.string().min(1, "JIRA_PROJECT_KEY is required"),
  JIRA_BOARD_ID: z.coerce.number().int().positive("JIRA_BOARD_ID must be a positive integer"),
  JIRA_DEFAULT_ISSUE_TYPE: z.string().min(1, "JIRA_DEFAULT_ISSUE_TYPE is required"),

  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),

  DAILY_TICKET_LIMIT: z.coerce.number().int().positive().default(10),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration. Check your .env file against .env.example:\n${issues}`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();
