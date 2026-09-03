"use client";

import { useEffect, useState } from "react";
import { Loader2, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { IssueType, QuotaStatus, TicketDraft } from "@/lib/types";

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
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [created, setCreated] = useState<{ jiraKey: string; jiraUrl: string } | null>(null);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create the ticket.");
      setStage("drafted");
    }
  }

  function handleReset() {
    setContext("");
    setDraft(null);
    setAssignee(null);
    setDueDate("");
    setCreated(null);
    setError(null);
    setStage("idle");
    refreshQuota();
  }

  const quotaExhausted = quota !== null && quota.remaining === 0;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TicketIcon className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">Jira Ticket Creator</h1>
              <p className="text-xs text-muted-foreground">AI-drafted tickets, created into the active sprint</p>
            </div>
          </div>
          <QuotaIndicator quota={quota} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-8">
        {error && <ErrorBanner message={error} />}

        {stage === "success" && created ? (
          <SuccessCard jiraKey={created.jiraKey} jiraUrl={created.jiraUrl} onReset={handleReset} />
        ) : (
          <>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <StepNumber n={1} />
                  Describe the ticket
                </CardTitle>
                <CardDescription className="pl-8">
                  The AI will turn this into a structured draft you can edit.
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
                  <CardTitle className="flex items-center gap-2 text-base">
                    <StepNumber n={2} />
                    Review &amp; edit
                  </CardTitle>
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
          </>
        )}
      </main>
    </div>
  );
}
