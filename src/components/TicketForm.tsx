"use client";

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
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="context">What&apos;s the ticket about?</Label>
        <Textarea
          id="context"
          rows={6}
          placeholder="Paste as much context as you have: what's broken, what's needed, links, error messages, who asked for it…"
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
        />
        <p className="text-right text-xs text-muted-foreground">{context.length}/8000 characters</p>
      </div>

      {!context && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Try an example:</span>
          {EXAMPLES.map((example, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onContextChange(example)}
              className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {example.slice(0, 32)}…
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="issue-type">Issue type</Label>
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
          {isGenerating ? "Generating…" : "Generate with AI"}
        </Button>
      </div>
    </div>
  );
}
