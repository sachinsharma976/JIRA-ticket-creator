import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getIssueStatuses } from "@/lib/jira";
import type { IssueStatus, TicketHistoryItem } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const STATUS_VALUES = ["PENDING", "CREATED", "FAILED"];

// Live Jira status is cached per issue key rather than per page/filter
// combination — that way pagination and filters don't each need their own
// cache slot, and a key already looked up on one page is reused on another.
const STATUS_CACHE_TTL_MS = 60_000;
const statusCache = new Map<string, { status: IssueStatus; fetchedAt: number }>();

// Even an explicit "refresh" click won't force a real Jira fetch more often
// than this, regardless of which page/filter it's clicked from — protects
// Jira from being hammered by a spammed button or a direct API call.
const MIN_REFRESH_INTERVAL_MS = 20_000;
let lastForceRefreshAt = 0;

async function getCachedStatuses(
  keys: string[],
  forceRefresh: boolean,
): Promise<{ statuses: Record<string, IssueStatus>; oldestFetchedAt: number | null; error?: string }> {
  if (keys.length === 0) return { statuses: {}, oldestFetchedAt: null };

  const now = Date.now();
  const toFetch: string[] = [];
  const statuses: Record<string, IssueStatus> = {};
  let oldestFetchedAt: number | null = now;

  for (const key of keys) {
    const cached = statusCache.get(key);
    if (!forceRefresh && cached && now - cached.fetchedAt < STATUS_CACHE_TTL_MS) {
      statuses[key] = cached.status;
      oldestFetchedAt = Math.min(oldestFetchedAt, cached.fetchedAt);
    } else {
      toFetch.push(key);
    }
  }

  if (toFetch.length > 0) {
    try {
      const fetched = await getIssueStatuses(toFetch);
      for (const [key, status] of Object.entries(fetched)) {
        statusCache.set(key, { status, fetchedAt: now });
        statuses[key] = status;
      }
    } catch (error) {
      console.error("Unexpected error fetching live issue statuses", error);
      return { statuses, oldestFetchedAt, error: "Couldn't fetch live status from Jira right now." };
    }
  }

  return { statuses, oldestFetchedAt };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search")?.trim() || undefined;
  const status = searchParams.get("status") || undefined;
  const assignee = searchParams.get("assignee") || undefined;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE));

  const where: Prisma.TicketWhereInput = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { jiraKey: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status && STATUS_VALUES.includes(status)) {
    where.status = status;
  }
  if (assignee) {
    where.assigneeName = assignee;
  }

  const [total, tickets, assigneeRows] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.findMany({
      where: { assigneeName: { not: null } },
      distinct: ["assigneeName"],
      select: { assigneeName: true },
      orderBy: { assigneeName: "asc" },
    }),
  ]);

  const now = Date.now();
  const wantsRefresh = searchParams.get("refresh") === "1";
  let throttled = false;
  let effectiveForce = wantsRefresh;
  if (wantsRefresh) {
    if (now - lastForceRefreshAt < MIN_REFRESH_INTERVAL_MS) {
      effectiveForce = false;
      throttled = true;
    } else {
      lastForceRefreshAt = now;
    }
  }

  const jiraKeys = tickets.map((t) => t.jiraKey).filter((k): k is string => k !== null);
  const { statuses: liveStatuses, oldestFetchedAt, error: liveStatusError } = await getCachedStatuses(
    jiraKeys,
    effectiveForce,
  );

  const items: TicketHistoryItem[] = tickets.map((t) => ({
    id: t.id,
    status: t.status,
    jiraKey: t.jiraKey,
    jiraUrl: t.jiraUrl,
    title: t.title,
    issueType: t.issueType,
    assigneeName: t.assigneeName,
    priority: t.priority,
    dueDate: t.dueDate,
    errorMessage: t.errorMessage,
    createdAt: t.createdAt.toISOString(),
    liveStatus: t.jiraKey ? (liveStatuses[t.jiraKey] ?? null) : null,
  }));

  return NextResponse.json({
    tickets: items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    assigneeOptions: assigneeRows.map((r) => r.assigneeName).filter((n): n is string => n !== null),
    fetchedAt: new Date(oldestFetchedAt ?? now).toISOString(),
    liveStatusError,
    throttled,
    retryAfterMs: throttled ? MIN_REFRESH_INTERVAL_MS - (now - lastForceRefreshAt) : undefined,
  });
}
