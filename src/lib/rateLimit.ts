import "server-only";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import type { IssueType } from "@/lib/types";
import type { Ticket } from "@/generated/prisma/client";

export class QuotaExceededError extends Error {
  constructor(readonly used: number, readonly limit: number) {
    super(`Daily limit of ${limit} tickets reached (${used}/${limit}).`);
    this.name = "QuotaExceededError";
  }
}

// Rows in these statuses count against today's quota. FAILED is excluded so
// a transient Jira outage doesn't permanently burn a slot.
const COUNTED_STATUSES = ["PENDING", "CREATED"];

export function getTodayRangeUtc(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function getQuotaStatus() {
  const { start, end } = getTodayRangeUtc();
  const used = await prisma.ticket.count({
    where: { status: { in: COUNTED_STATUSES }, createdAt: { gte: start, lt: end } },
  });
  const limit = env.DAILY_TICKET_LIMIT;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetsAt: end.toISOString(),
  };
}

// Atomically checks and consumes one slot of today's quota. Must be called
// BEFORE any external Jira call — the transaction is the single point where
// concurrent requests are serialized, so it must not wrap slow network I/O.
export async function reserveTicketSlot(data: {
  title: string;
  issueType: IssueType;
  assigneeAccountId?: string;
  assigneeName?: string;
  dueDate?: string;
  createdBy?: string;
}): Promise<Ticket> {
  const { start, end } = getTodayRangeUtc();
  const limit = env.DAILY_TICKET_LIMIT;

  return prisma.$transaction(
    async (tx) => {
      const used = await tx.ticket.count({
        where: { status: { in: COUNTED_STATUSES }, createdAt: { gte: start, lt: end } },
      });

      if (used >= limit) {
        throw new QuotaExceededError(used, limit);
      }

      return tx.ticket.create({
        data: {
          status: "PENDING",
          title: data.title,
          issueType: data.issueType,
          assigneeAccountId: data.assigneeAccountId,
          assigneeName: data.assigneeName,
          dueDate: data.dueDate,
          createdBy: data.createdBy,
        },
      });
    },
    // Prisma's default maxWait (~2s) is too tight for Prisma Postgres's
    // direct (unpooled) connection, which can take longer than that just to
    // establish a fresh connection under load — this was causing real
    // "Unable to start a transaction in the given time" failures in prod use.
    { maxWait: 10_000, timeout: 10_000 },
  );
}

export async function markTicketCreated(
  id: string,
  jiraKey: string,
  jiraUrl: string,
  startDate: string,
): Promise<Ticket> {
  return prisma.ticket.update({
    where: { id },
    data: { status: "CREATED", jiraKey, jiraUrl, startDate },
  });
}

export async function markTicketFailed(id: string, errorMessage: string): Promise<Ticket> {
  return prisma.ticket.update({
    where: { id },
    data: { status: "FAILED", errorMessage },
  });
}
