"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusChip, statusChipInfo } from "@/components/StatusChip";
import { cn } from "@/lib/utils";
import type { TicketHistoryItem } from "@/lib/types";

const REFRESH_COOLDOWN_MS = 20_000;
const SEARCH_DEBOUNCE_MS = 400;

const STATUS_OPTIONS = [
  { value: "CREATED", label: "Created" },
  { value: "FAILED", label: "Failed" },
  { value: "PENDING", label: "Incomplete" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function buildHistoryUrl(params: {
  search: string;
  status: string;
  assignee: string;
  page: number;
  refresh?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.assignee) qs.set("assignee", params.assignee);
  qs.set("page", String(params.page));
  if (params.refresh) qs.set("refresh", "1");
  return `/api/tickets/history?${qs.toString()}`;
}

export default function TicketsHistoryPage() {
  const [tickets, setTickets] = useState<TicketHistoryItem[] | null>(null);
  const [liveStatusError, setLiveStatusError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [assigneeOptions, setAssigneeOptions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce the free-text search before it drives a fetch. Any filter
  // change (including this one, once debounced) starts back at page 1.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  function handleStatusChange(value: string | null) {
    setStatus(value && value !== "all" ? value : "");
    setPage(1);
  }

  function handleAssigneeChange(value: string | null) {
    setAssignee(value && value !== "all" ? value : "");
    setPage(1);
  }

  function applyResponse(data: {
    tickets: TicketHistoryItem[];
    liveStatusError?: string;
    fetchedAt: string;
    assigneeOptions: string[];
    totalPages: number;
    total: number;
  }) {
    setTickets(data.tickets);
    setLiveStatusError(data.liveStatusError);
    setFetchedAt(data.fetchedAt);
    setAssigneeOptions(data.assigneeOptions);
    setTotalPages(data.totalPages);
    setTotal(data.total);
  }

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(buildHistoryUrl({ search, status, assignee, page, refresh: true }));
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load tickets.");
        return;
      }
      setError(null);
      applyResponse(data);
      // Reflects at least REFRESH_COOLDOWN_MS from the data's real age, via
      // retryAfterMs when the server throttled this click instead of refetching.
      setCooldownRemaining(data.throttled ? data.retryAfterMs : REFRESH_COOLDOWN_MS);
    } catch {
      setError("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }

  // Fetch whenever filters/page change (search/status/assignee/page).
  useEffect(() => {
    let cancelled = false;
    const loadingTimer = setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);
    fetch(buildHistoryUrl({ search, status, assignee, page }))
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) {
          setError(null);
          applyResponse(data);
        } else {
          setError(data.error ?? "Failed to load tickets.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load tickets.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(loadingTimer);
    };
  }, [search, status, assignee, page]);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((ms) => Math.max(0, ms - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex w-full max-w-350 items-center justify-between gap-4 px-7 py-4">
          <div>
            <h1 className="text-[20px] font-semibold leading-tight text-foreground">Tickets</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Tickets created using Ticket Creator</p>
          </div>
          <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
            {fetchedAt && <span>Updated {formatTime(fetchedAt)}</span>}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={refresh}
              disabled={loading || cooldownRemaining > 0}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              {cooldownRemaining > 0 ? `Refresh (${cooldownSeconds}s)` : "Refresh"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-350 flex-1 px-7 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-danger/25 bg-danger-bg px-4 py-3 text-[13px] text-danger">
            {error}
          </div>
        )}

        {liveStatusError && (
          <div className="mb-4 flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning-bg px-3 py-2 text-[13px] text-warning">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {liveStatusError}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tertiary-foreground" />
            <Input
              placeholder="Search by title or ticket ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8"
            />
          </div>
          {/* <Select value={status || "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select> */}
          <Select value={assignee || "all"} onValueChange={handleAssigneeChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {assigneeOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!tickets && !error && (
          <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {tickets && tickets.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center text-[13px] text-muted-foreground">
            No tickets match these filters.
          </div>
        )}

        {tickets && tickets.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-[12px] text-muted-foreground">
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
                    const chip = statusChipInfo(t);
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-border-subtle transition-colors last:border-0 hover:bg-muted/60"
                      >
                        <td className="max-w-xs px-4 py-3.5">
                          <p className="truncate text-[13px] font-medium text-foreground">{t.title}</p>
                          {t.jiraUrl ? (
                            <a
                              href={t.jiraUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary hover:underline"
                            >
                              {t.jiraKey} <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="mt-0.5 block text-[12px] text-tertiary-foreground">—</span>
                          )}
                          {t.status === "FAILED" && t.errorMessage && (
                            <p className="mt-0.5 truncate text-[12px] text-danger">{t.errorMessage}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusChip label={chip.label} color={chip.color} />
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{t.assigneeName ?? "Unassigned"}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{t.priority ?? "—"}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{t.dueDate ?? "—"}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{formatDate(t.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-[13px] text-muted-foreground">
              <span>
                {total} ticket{total === 1 ? "" : "s"} · Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
