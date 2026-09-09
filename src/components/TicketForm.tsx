"use client";

import { useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { SpeechToTextButton } from "@/components/SpeechToTextButton";
import type { IssueType } from "@/lib/types";

const ISSUE_TYPES: IssueType[] = ["Task", "Story", "Bug"];

const EXAMPLES = [
  "Checkout fails with a 500 error when a customer applies a promo code and their cart total is exactly $0.",
  "Add a dark mode toggle to the dashboard settings page, remembered per user.",
  "The monthly report export times out for accounts with more than 10,000 rows.",
];

export function TicketForm({
  context,
  issueType,
  isGenerating,
  disabled,
  onContextChange,
  onIssueTypeChange,
  onGenerate,
}: {
  context: string;
  issueType: IssueType;
  isGenerating: boolean;
  disabled: boolean;
  onContextChange: (value: string) => void;
  onIssueTypeChange: (value: IssueType) => void;
  onGenerate: () => void;
}) {
  // A continuous dictation session can fire multiple result events; the
  // handler passed to SpeechToTextButton is captured once when listening
  // starts, so it must read/update the latest context via a ref rather than
  // the `context` closure variable, or later segments in the same session
  // would each append onto the stale pre-session text and clobber earlier
  // segments instead of accumulating.
  const contextRef = useRef(context);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="context" className="text-[13px] font-medium">
          What do you want to build, fix, or change?
        </Label>
        <div className="relative">
          <Textarea
            id="context"
            rows={5}
            className="min-h-33 resize-none pb-9 text-sm"
            placeholder="Paste requirements, bugs, error messages, links, or anything that gives the AI context…"
            value={context}
            onChange={(e) => onContextChange(e.target.value)}
          />
          <div className="pointer-events-none absolute inset-x-2.5 bottom-2 flex items-center justify-between">
            <div className="pointer-events-auto cursor-pointer">
              <SpeechToTextButton
                disabled={disabled || isGenerating}
                onTranscript={(text) => {
                  const base = contextRef.current;
                  const next = base ? `${base.replace(/\s+$/, "")} ${text}` : text;
                  contextRef.current = next;
                  onContextChange(next);
                }}
              />
            </div>
            <p className="text-[11px] text-tertiary-foreground">{context.length}/8000</p>
          </div>
        </div>
      </div>

      {!context && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-muted-foreground">Try an example</span>
          {EXAMPLES.map((example, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onContextChange(example)}
              className="rounded-md border border-border bg-background px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {example.slice(0, 32)}…
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="issue-type" className="text-[13px] font-medium">
            Issue type
          </Label>
          <Select value={issueType} onValueChange={(v) => onIssueTypeChange(v as IssueType)}>
            <SelectTrigger id="issue-type" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ISSUE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          onClick={onGenerate}
          disabled={disabled || isGenerating || context.trim().length < 10}
          className="gap-2"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? "Generating…" : "Generate ticket"}
        </Button>
      </div>
    </div>
  );
}
