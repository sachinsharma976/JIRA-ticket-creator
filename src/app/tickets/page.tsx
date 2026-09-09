"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TicketHistoryItem } from "@/lib/types";

const REFRESH_COOLDOWN_MS = 20_000;

function statusBadgeVariant(item: TicketHistoryItem): { label: string; className: string } {
  if (item.status === "FAILED") {
    return { label: "Failed to create", className: "bg-destructive/10 text-destructive border-destructive/30" };
  }
  if (item.status === "PENDING") {
    return { label: "Incomplete", className: "bg-muted text-muted-foreground" };
  }
  if (item.liveStatus) {
    const colors: Record<string, string> = {
      new: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
      indeterminate: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
      done: "bg-green-600/10 text-green-700 dark:text-green-400 border-green-600/30",
      unknown: "bg-muted text-muted-foreground",
    };
    return { label: item.liveStatus.name, className: colors[item.liveStatus.category] };
  }
  return { label: "Created", className: "bg-muted text-muted-foreground" };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function TicketsHistoryPage() {
  const [tickets, setTickets] = useState<TicketHistoryItem[] | null>(null);
  const [liveStatusError, setLiveStatusError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  async function load(refresh: boolean) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/history${refresh ? "?refresh=1" : ""}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load tickets.");
        return;
      }
      setError(null);
      setTickets(data.tickets);
      setLiveStatusError(data.liveStatusError);
      setFetchedAt(data.fetchedAt);
      if (refresh) {
        // Start the client-side cooldown regardless of whether the server
        // actually refetched or served cache (e.g. two tabs both clicking
        // refresh) — it always reflects at least REFRESH_COOLDOWN_MS from
        // the data's real age, via retryAfterMs when the server throttled it.
        setCooldownRemaining(data.throttled ? data.retryAfterMs : REFRESH_COOLDOWN_MS);
      }
    } catch {
      setError("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tickets/history")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) {
          setTickets(data.tickets);
          setLiveStatusError(data.liveStatusError);
          setFetchedAt(data.fetchedAt);
        } else {
          setError(data.error ?? "Failed to load tickets.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load tickets.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((ms) => Math.max(0, ms - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <h1 className="text-sm font-semibold">Tickets created</h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {fetchedAt && <span>Updated {formatTime(fetchedAt)}</span>}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => load(true)}
              disabled={loading || cooldownRemaining > 0}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              {cooldownRemaining > 0 ? `Refresh (${cooldownSeconds}s)` : "Refresh"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {liveStatusError && (
          <div className="mb-4 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {liveStatusError}
          </div>
        )}

        {!tickets && !error && (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {tickets && tickets.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center text-sm text-muted-foreground">
            No tickets created yet.
          </div>
        )}

        {tickets && tickets.length > 0 && (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Ticket</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Assignee</th>
                  <th className="px-4 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Due</th>
                  <th className="px-4 py-2.5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const badge = statusBadgeVariant(t);
                  return (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="max-w-xs px-4 py-3">
                        {t.jiraUrl ? (
                          <a
                            href={t.jiraUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium hover:underline"
                          >
                            <span className="font-mono text-xs text-muted-foreground">{t.jiraKey}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">—</span>
                        )}
                        <p className="truncate">{t.title}</p>
                        {t.status === "FAILED" && t.errorMessage && (
                          <p className="truncate text-xs text-destructive">{t.errorMessage}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("border", badge.className)}>
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.assigneeName ?? "Unassigned"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.priority ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.dueDate ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
