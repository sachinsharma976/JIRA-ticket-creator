
"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TicketForm } from "@/components/TicketForm";
import { DraftEditor } from "@/components/DraftEditor";
import { QuotaIndicator } from "@/components/QuotaIndicator";
import { ErrorBanner } from "@/components/ErrorBanner";
import { SuccessCard } from "@/components/SuccessCard";
import { LivePreviewPanel } from "@/components/LivePreviewPanel";
import { AttachmentPicker } from "@/components/AttachmentPicker";
import { Label } from "@/components/ui/label";
import type { FailedAttachment, IssueType, QuotaStatus, TicketDraft, UploadedAttachment } from "@/lib/types";

type Stage = "idle" | "drafting" | "drafted" | "creating" | "success";
type Assignee = { accountId: string; displayName: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {n}
    </span>
  );
}

export default function Home() {
  const [context, setContext] = useState("");
  const [issueType, setIssueType] = useState<IssueType>("Task");
  const [draft, setDraft] = useState<TicketDraft | null>(null);
  const [assignee, setAssignee] = useState<Assignee | null>(null);
  const [startDate] = useState(todayIso);
  const [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [created, setCreated] = useState<{ jiraKey: string; jiraUrl: string } | null>(null);
  const [attachmentResult, setAttachmentResult] = useState<{
    uploaded: UploadedAttachment[];
    failed: FailedAttachment[];
  } | null>(null);

  async function refreshQuota() {
    try {
      const res = await fetch("/api/tickets/quota");
      if (res.ok) setQuota(await res.json());
    } catch {
      // Quota display is best-effort; the server still enforces the limit.
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tickets/quota")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setQuota(data);
      })
      .catch(() => {
        // Quota display is best-effort; the server still enforces the limit.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerate() {
    setError(null);
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
          console.log("🚀 ~ handleCreate ~ e:", e)
      setError(e instanceof Error ? e.message : "Failed to create the ticket.");
      setStage("drafted");
    }
  }

  function handleReset() {
    setContext("");
    setDraft(null);
    setAssignee(null);
    setDueDate("");
    setFiles([]);
    setCreated(null);
    setAttachmentResult(null);
    setError(null);
    setStage("idle");
    refreshQuota();
  }

  const quotaExhausted = quota !== null && quota.remaining === 0;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TicketIcon className="h-4.5 w-4.5" />
            </div>
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-sm font-semibold leading-tight">Jira Ticket Creator</h1>
                <p className="text-xs text-muted-foreground">AI-drafted tickets, created into the active sprint</p>
              </div>
              <Badge variant="secondary" className="text-[0.65rem]">
                Beta
              </Badge>
            </div>
          </div>
          <QuotaIndicator quota={quota} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {error && <ErrorBanner message={error} />}

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
          <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
            <div className="flex flex-col gap-5">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <StepNumber n={1} />
                    Describe the context
                  </CardTitle>
                  <CardDescription className="pl-8">
                    Explain what you need in plain words — the AI will suggest the ticket details.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TicketForm
                    context={context}
                    issueType={issueType}
                    isGenerating={stage === "drafting"}
                    disabled={stage === "creating"}
                    onContextChange={setContext}
                    onIssueTypeChange={setIssueType}
                    onGenerate={handleGenerate}
                  />
                </CardContent>
              </Card>

              {draft && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <StepNumber n={2} />
                        Review &amp; edit
                      </CardTitle>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={stage === "drafting"}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3 w-3 ${stage === "drafting" ? "animate-spin" : ""}`} />
                        Regenerate
                      </button>
                    </div>
                    <CardDescription className="pl-8">
                      Make any changes before creating the ticket in Jira.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <DraftEditor
                      draft={draft}
                      onChange={setDraft}
                      assignee={assignee}
                      onAssigneeChange={setAssignee}
                      startDate={startDate}
                      dueDate={dueDate}
                      onDueDateChange={setDueDate}
                    />

                    <div className="space-y-1.5">
                      <Label>Attachments (optional)</Label>
                      <AttachmentPicker files={files} onChange={setFiles} />
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t pt-4">
                      {quotaExhausted ? (
                        <p className="text-sm text-muted-foreground">
                          Daily limit reached — try again after the reset time above.
                        </p>
                      ) : (
                        <span />
                      )}
                      <Button
                        onClick={handleCreate}
                        disabled={stage === "creating" || quotaExhausted}
                        className="gap-2"
                      >
                        {stage === "creating" && <Loader2 className="h-4 w-4 animate-spin" />}
                        {stage === "creating" ? "Creating…" : "Create Ticket"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
