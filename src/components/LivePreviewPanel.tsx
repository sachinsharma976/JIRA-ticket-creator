"use client";

import { useEffect, useState } from "react";
import { Sparkles, User, CalendarDays, Layers, AlertTriangle, Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { TicketDraft } from "@/lib/types";

function formatDisplayDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
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
    <Card className="shadow-sm lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Live Preview
        </CardTitle>
        <CardDescription>This is what will be created in Jira.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!draft ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            <Sparkles className="h-5 w-5" />
            Generate a draft to see it here
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Summary</p>
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium">{draft.title}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Description</p>
              <div className="space-y-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Problem</p>
                  <p>{draft.description.problem}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Scope</p>
                  <p>{draft.description.scope}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Acceptance criteria</p>
              <ul className="space-y-1 rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
                {draft.acceptanceCriteria.map((item, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-muted-foreground">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5 border-t pt-3">
              <InfoRow icon={Layers} label="Issue type" value={issueType} />
              <InfoRow icon={User} label="Assignee" value={assignee?.displayName ?? "Unassigned"} />
              <InfoRow
                icon={CalendarDays}
                label="Dates"
                value={dueDate ? `${formatDisplayDate(startDate)} → ${formatDisplayDate(dueDate)}` : formatDisplayDate(startDate)}
              />
              <InfoRow
                icon={Paperclip}
                label="Attachments"
                value={attachmentCount > 0 ? `${attachmentCount} file${attachmentCount > 1 ? "s" : ""}` : "None"}
              />
            </div>
          </>
        )}

        <div className="border-t pt-3 text-sm">
          {sprintState.status === "loading" && (
            <p className="text-muted-foreground">Checking active sprint…</p>
          )}
          {sprintState.status === "ok" && (
            <p className="text-muted-foreground">
              Will be added to <span className="font-medium text-foreground">{sprintState.name}</span>
            </p>
          )}
          {sprintState.status === "error" && (
            <div className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{sprintState.message}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
