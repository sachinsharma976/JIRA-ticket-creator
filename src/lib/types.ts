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
