"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TicketForm } from "@/components/TicketForm";
import { DraftEditor } from "@/components/DraftEditor";
import { ErrorBanner } from "@/components/ErrorBanner";
import { SuccessCard } from "@/components/SuccessCard";
import { LivePreviewPanel } from "@/components/LivePreviewPanel";
import { AttachmentPicker } from "@/components/AttachmentPicker";
import { DuplicateWarning } from "@/components/DuplicateWarning";
import { Label } from "@/components/ui/label";
import { useQuota } from "@/components/QuotaProvider";
import { cn } from "@/lib/utils";
import type {
  FailedAttachment,
  IssueType,
  SimilarIssue,
  TicketDraft,
  UploadedAttachment,
} from "@/lib/types";

type Stage = "idle" | "drafting" | "drafted" | "creating" | "success";
type Assignee = { accountId: string; displayName: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const DRAFT_STORAGE_KEY = "jira-ticket-creator:draft-v1";

interface PersistedDraft {
  context: string;
  issueType: IssueType;
  draft: TicketDraft | null;
  assignee: Assignee | null;
  priority: string;
  dueDate: string;
}

function readPersistedDraft(): PersistedDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedDraft) : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const { quota, setQuota, refreshQuota } = useQuota();

  // Read once, synchronously, on first render — restoring an in-progress
  // draft this way (rather than in an effect) avoids a flash of empty state.
  const [initialDraft] = useState(readPersistedDraft);

  const [context, setContext] = useState(initialDraft?.context ?? "");
  const [issueType, setIssueType] = useState<IssueType>(initialDraft?.issueType ?? "Task");
  const [draft, setDraft] = useState<TicketDraft | null>(initialDraft?.draft ?? null);
  const [assignee, setAssignee] = useState<Assignee | null>(initialDraft?.assignee ?? null);
  const [priority, setPriority] = useState(initialDraft?.priority ?? "");
  const [startDate] = useState(todayIso);
  const [dueDate, setDueDate] = useState(initialDraft?.dueDate ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>(initialDraft?.draft ? "drafted" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ jiraKey: string; jiraUrl: string } | null>(null);
  const [attachmentResult, setAttachmentResult] = useState<{
    uploaded: UploadedAttachment[];
    failed: FailedAttachment[];
  } | null>(null);
  const [duplicates, setDuplicates] = useState<SimilarIssue[]>([]);
  const [contextExpanded, setContextExpanded] = useState(!initialDraft?.draft);

  // Persist in-progress work so a refresh doesn't lose it (restore happens
  // synchronously above, via the initialDraft lazy state initializer).
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        const toSave: PersistedDraft = { context, issueType, draft, assignee, priority, dueDate };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(toSave));
      } catch {
        // Best-effort — e.g. private browsing can block storage.
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [context, issueType, draft, assignee, priority, dueDate]);

  function clearPersistedDraft() {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore.
    }
  }

  async function handleGenerate() {
    setError(null);
    setDuplicates([]);
    setStage("drafting");
    try {
      const res = await fetch("/api/tickets/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, issueType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate a draft.");
      setDraft(data.draft);
      setStage("drafted");
      setContextExpanded(false);

      // Best-effort, non-blocking — the draft is already shown either way.
      fetch("/api/tickets/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.draft.title }),
      })
        .then((r) => (r.ok ? r.json() : { matches: [] }))
        .then((d) => setDuplicates(d.matches ?? []))
        .catch(() => setDuplicates([]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate a draft.");
      setStage("idle");
    }
  }

  async function handleCreate() {
    if (!draft) return;
    setError(null);
    setStage("creating");
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          issueType,
          assigneeAccountId: assignee?.accountId,
          assigneeName: assignee?.displayName,
          priority: priority || undefined,
          dueDate: dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.limit !== undefined) setQuota(data);
        throw new Error(data.error ?? "Failed to create the ticket.");
      }
      setQuota(data.quota);
      setCreated({ jiraKey: data.jiraKey, jiraUrl: data.jiraUrl });
      setStage("success");
      clearPersistedDraft();

      // Attachments require the issue to exist first, so this is a
      // best-effort follow-up — a failed upload doesn't undo the ticket.
      if (files.length > 0) {
        const body = new FormData();
        files.forEach((f) => body.append("files", f));
        try {
          const attachRes = await fetch(`/api/tickets/${data.jiraKey}/attachments`, {
            method: "POST",
            body,
          });
          const attachData = await attachRes.json();
          setAttachmentResult({ uploaded: attachData.uploaded ?? [], failed: attachData.failed ?? [] });
        } catch {
          setAttachmentResult({ uploaded: [], failed: files.map((f) => ({ filename: f.name, error: "Upload failed." })) });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create the ticket.");
      setStage("drafted");
    }
  }

  function handleReset() {
    setContext("");
    setDraft(null);
    setAssignee(null);
    setPriority("");
    setDueDate("");
    setFiles([]);
    setCreated(null);
    setAttachmentResult(null);
    setDuplicates([]);
    setError(null);
    setStage("idle");
    setContextExpanded(true);
    clearPersistedDraft();
    refreshQuota();
  }

  const quotaExhausted = quota !== null && quota.remaining === 0;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto w-full max-w-7xl px-7 py-4">
          <h1 className="text-[20px] font-semibold leading-tight text-foreground">Create Ticket</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Turn context into a structured Jira ticket.</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-7 py-6">
        {error && (
          <div className="mb-5">
            <ErrorBanner message={error} />
          </div>
        )}

        {stage === "success" && created ? (
          <div className="mx-auto max-w-2xl">
            <SuccessCard
              jiraKey={created.jiraKey}
              jiraUrl={created.jiraUrl}
              hasAttachments={files.length > 0}
              attachmentResult={attachmentResult}
              onReset={handleReset}
            />
          </div>
        ) : (
          <div className="grid min-w-0 gap-5 min-[900px]:grid-cols-[1fr_300px] min-[900px]:items-start min-[1200px]:grid-cols-[1fr_360px]">
            <div className="min-w-0 rounded-xl border border-border bg-card shadow-card">
              <div className="p-6">
                {/* Step 1 — collapses to a compact summary once a draft exists */}
                {draft && !contextExpanded ? (
                  <div className="flex items-center gap-3">
                    {stage === "drafting" ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <Check className="h-4 w-4 shrink-0 text-success" />
                    )}
                    <button
                      type="button"
                      onClick={() => setContextExpanded(true)}
                      className="min-w-0 flex-1 truncate text-left text-sm text-foreground hover:text-primary"
                      title="Edit context"
                    >
                      {context}
                    </button>
                    <Badge variant="outline" className="shrink-0 rounded-md text-[11px] font-medium">
                      {issueType}
                    </Badge>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={stage === "drafting"}
                      className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      <RefreshCw className={cn("h-3 w-3", stage === "drafting" && "animate-spin")} />
                      Regenerate
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                        1
                      </span>
                      <h2 className="text-[16px] font-semibold text-foreground">Describe your ticket</h2>
                    </div>
                    <p className="mt-1 pl-7 text-[13px] text-muted-foreground">
                      Give the AI enough context to generate a useful ticket.
                    </p>
                    <div className="mt-4">
                      <TicketForm
                        context={context}
                        issueType={issueType}
                        isGenerating={stage === "drafting"}
                        disabled={stage === "creating"}
                        onContextChange={setContext}
                        onIssueTypeChange={setIssueType}
                        onGenerate={handleGenerate}
                      />
                    </div>
                  </div>
                )}

                {draft && (
                  <>
                    <div className="my-6 border-t border-border-subtle" />

                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                        2
                      </span>
                      <h2 className="text-[16px] font-semibold text-foreground">Review ticket</h2>
                    </div>
                    <p className="mt-1 pl-7 text-[13px] text-muted-foreground">
                      Edit anything before creating the ticket in Jira.
                    </p>

                    <div className="mt-4 space-y-5 pl-7">
                      <DuplicateWarning matches={duplicates} />

                      <DraftEditor
                        draft={draft}
                        onChange={setDraft}
                        issueType={issueType}
                        assignee={assignee}
                        onAssigneeChange={setAssignee}
                        priority={priority}
                        onPriorityChange={setPriority}
                        startDate={startDate}
                        dueDate={dueDate}
                        onDueDateChange={setDueDate}
                      />

                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-medium">Attachments (optional)</Label>
                        <AttachmentPicker files={files} onChange={setFiles} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {draft && (
                <div className="flex items-center justify-between gap-4 border-t border-border-subtle px-6 py-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={stage === "creating"}
                    className="text-[13px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    Discard changes
                  </button>
                  <div className="flex items-center gap-3">
                    {quotaExhausted && (
                      <p className="text-[13px] text-muted-foreground">Daily limit reached</p>
                    )}
                    <Button
                      onClick={handleCreate}
                      disabled={stage === "creating" || quotaExhausted}
                      className="gap-1.5"
                    >
                      {stage === "creating" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                        </>
                      ) : (
                        <>
                          Create in Jira <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <LivePreviewPanel
              draft={draft}
              issueType={issueType}
              assignee={assignee}
              startDate={startDate}
              dueDate={dueDate}
              attachmentCount={files.length}
            />
          </div>
        )}
      </main>
    </div>
  );
}
