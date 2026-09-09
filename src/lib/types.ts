import { z } from "zod";

export const issueTypeEnum = z.enum(["Task", "Story", "Bug"]);
export type IssueType = z.infer<typeof issueTypeEnum>;

export const draftRequestSchema = z.object({
  context: z
    .string()
    .min(10, "Give a bit more context (at least 10 characters).")
    .max(8000, "Context is too long (max 8000 characters)."),
  issueType: issueTypeEnum.default("Task"),
});
export type DraftRequest = z.infer<typeof draftRequestSchema>;

export const ticketDraftSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.object({
    problem: z.string().min(1),
    scope: z.string().min(1),
  }),
  acceptanceCriteria: z.array(z.string().min(1)).min(1),
});
export type TicketDraft = z.infer<typeof ticketDraftSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

export const createTicketSchema = ticketDraftSchema.extend({
  issueType: issueTypeEnum,
  assigneeAccountId: z.string().min(1).optional(),
  assigneeName: z.string().min(1).optional(),
  priority: z.string().min(1).optional(),
  dueDate: isoDate.optional(),
});
export type CreateTicketRequest = z.infer<typeof createTicketSchema>;

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
}

export interface AssignableUser {
  accountId: string;
  displayName: string;
  avatarUrl?: string;
}

// Attachment limits, shared by the client (form validation/hints) and the
// server (authoritative enforcement — never trust the client-side checks).
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_ATTACHMENTS = 5;
// Light safety net against uploading executables through this proxy — Jira
// would just store them inertly, but there's no reason to allow it.
export const BLOCKED_ATTACHMENT_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".com", ".msi", ".sh", ".dll", ".scr", ".ps1",
];

export interface UploadedAttachment {
  id: string;
  filename: string;
}
export interface FailedAttachment {
  filename: string;
  error: string;
}

export interface JiraPriority {
  id: string;
  name: string;
}

export interface SimilarIssue {
  key: string;
  summary: string;
  status: string;
  url: string;
}

export interface IssueStatus {
  name: string;
  category: "new" | "indeterminate" | "done" | "unknown";
}

export interface TicketHistoryItem {
  id: string;
  status: string;
  jiraKey: string | null;
  jiraUrl: string | null;
  title: string;
  issueType: string;
  assigneeName: string | null;
  priority: string | null;
  dueDate: string | null;
  errorMessage: string | null;
  createdAt: string;
  liveStatus: IssueStatus | null;
}
