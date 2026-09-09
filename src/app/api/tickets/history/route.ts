import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIssueStatuses } from "@/lib/jira";
import type { TicketHistoryItem } from "@/lib/types";

const HISTORY_LIMIT = 50;

// Normal page loads reuse a result this fresh without touching Jira at all.
const AUTO_TTL_MS = 60_000;
// Even an explicit "refresh" click won't trigger a real fetch more often
// than this — protects Jira from being hammered by a spammed button (or a
// direct API call bypassing the client's own cooldown UI).
const MIN_REFRESH_INTERVAL_MS = 20_000;

// Per-process in-memory cache. Fine for a single dev server or one warm
// serverless instance; a cold start or a different instance just refetches
// — this is a rate-limit/UX nicety, not a source of truth (Prisma is).
let cache: { body: unknown; fetchedAt: number } | null = null;

async function fetchHistory(): Promise<{ tickets: TicketHistoryItem[]; liveStatusError?: string }> {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });

  const jiraKeys = tickets.map((t) => t.jiraKey).filter((k): k is string => k !== null);

  let liveStatuses: Awaited<ReturnType<typeof getIssueStatuses>> = {};
  let liveStatusError: string | undefined;
  if (jiraKeys.length > 0) {
    try {
      liveStatuses = await getIssueStatuses(jiraKeys);
    } catch (error) {
      console.error("Unexpected error fetching live issue statuses", error);
      liveStatusError = "Couldn't fetch live status from Jira right now.";
    }
  }

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

  return { tickets: items, liveStatusError };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wantsRefresh = searchParams.get("refresh") === "1";
  const now = Date.now();
  const age = cache ? now - cache.fetchedAt : Infinity;

  const withinAutoTtl = !wantsRefresh && age < AUTO_TTL_MS;
  const refreshTooSoon = wantsRefresh && age < MIN_REFRESH_INTERVAL_MS;

  if (cache && (withinAutoTtl || refreshTooSoon)) {
    return NextResponse.json({
      ...(cache.body as object),
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
      cached: true,
      throttled: refreshTooSoon,
      retryAfterMs: refreshTooSoon ? MIN_REFRESH_INTERVAL_MS - age : undefined,
    });
  }

  const body = await fetchHistory();
  cache = { body, fetchedAt: now };

  return NextResponse.json({ ...body, fetchedAt: new Date(now).toISOString(), cached: false });
}
