"use client";

import { useEffect, useState } from "react";
import { Sparkles, User, CalendarDays, Paperclip, AlertTriangle } from "lucide-react";
import type { TicketDraft } from "@/lib/types";

function formatDisplayDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function MetaRow({ icon: Icon, value }: { icon: typeof User; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0 text-tertiary-foreground" />
      {value}
    </div>
  );
}

export function LivePreviewPanel({
  draft,
  issueType,
  assignee,
  startDate,
  dueDate,
  attachmentCount,
}: {
  draft: TicketDraft | null;
  issueType: string;
  assignee: { displayName: string } | null;
  startDate: string;
  dueDate: string;
  attachmentCount: number;
}) {
  const [sprintState, setSprintState] = useState<
    { status: "loading" } | { status: "ok"; name: string } | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tickets/sprint")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) setSprintState({ status: "ok", name: data.sprint.name });
        else setSprintState({ status: "error", message: data.error ?? "No active sprint found." });
      })
      .catch(() => {
        if (!cancelled) setSprintState({ status: "error", message: "Couldn't check the active sprint." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card min-[900px]:sticky min-[900px]:top-19">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-[16px] font-semibold text-foreground">Live Preview</h2>
      </div>
      <p className="mt-0.5 text-[13px] text-muted-foreground">This is what will be created in Jira.</p>

      <div className="my-4 border-t border-border-subtle" />

      {!draft ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Sparkles className="h-4 w-4 text-tertiary-foreground" />
          <p className="text-[13px] text-muted-foreground">Generate a ticket to preview it here</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-[15px] font-semibold leading-snug text-foreground">{draft.title}</h3>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                {issueType}
              </span>
              {sprintState.status === "ok" && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {sprintState.name}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-border-subtle pt-4">
            <p className="text-[12px] font-medium text-muted-foreground">Problem</p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground">{draft.description.problem}</p>
          </div>

          <div className="border-t border-border-subtle pt-4">
            <p className="text-[12px] font-medium text-muted-foreground">Scope</p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground">{draft.description.scope}</p>
          </div>

          <div className="border-t border-border-subtle pt-4">
            <p className="text-[12px] font-medium text-muted-foreground">Acceptance criteria</p>
            <ul className="mt-1 space-y-1">
              {draft.acceptanceCriteria.map((item, i) => (
                <li key={i} className="flex gap-1.5 text-[13px] leading-relaxed text-foreground">
                  <span className="text-tertiary-foreground">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5 border-t border-border-subtle pt-4">
            <MetaRow icon={User} value={assignee?.displayName ?? "Unassigned"} />
            <MetaRow
              icon={CalendarDays}
              value={dueDate ? `${formatDisplayDate(startDate)} → ${formatDisplayDate(dueDate)}` : formatDisplayDate(startDate)}
            />
            <MetaRow
              icon={Paperclip}
              value={attachmentCount > 0 ? `${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""}` : "No attachments"}
            />
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-border-subtle pt-4 text-[13px]">
        {sprintState.status === "loading" && <p className="text-muted-foreground">Checking active sprint…</p>}
        {sprintState.status === "ok" && (
          <p className="text-muted-foreground">
            Will be added to <span className="font-medium text-foreground">{sprintState.name}</span>
          </p>
        )}
        {sprintState.status === "error" && (
          <div className="flex items-start gap-1.5 text-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{sprintState.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
