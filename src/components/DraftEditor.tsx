"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AcceptanceCriteriaList } from "@/components/AcceptanceCriteriaList";
import { AssigneeCombobox } from "@/components/AssigneeCombobox";
import type { TicketDraft } from "@/lib/types";

function formatDisplayDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function DraftEditor({
  draft,
  onChange,
  assignee,
  onAssigneeChange,
  startDate,
  dueDate,
  onDueDateChange,
}: {
  draft: TicketDraft;
  onChange: (draft: TicketDraft) => void;
  assignee: { accountId: string; displayName: string } | null;
  onAssigneeChange: (user: { accountId: string; displayName: string } | null) => void;
  startDate: string;
  dueDate: string;
  onDueDateChange: (date: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="draft-title">Title</Label>
        <Input
          id="draft-title"
          value={draft.title}
          maxLength={255}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
        />
      </div>

      <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Assignee</Label>
          <AssigneeCombobox value={assignee} onChange={onAssigneeChange} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="draft-start-date" className="text-xs text-muted-foreground">
            Start date
          </Label>
          <Input
            id="draft-start-date"
            className="bg-background"
            value={formatDisplayDate(startDate)}
            disabled
            readOnly
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="draft-due-date" className="text-xs text-muted-foreground">
            Due date
          </Label>
          <Input
            id="draft-due-date"
            className="bg-background"
            type="date"
            min={startDate}
            value={dueDate}
            onChange={(e) => onDueDateChange(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-1">
        <div className="space-y-1.5">
          <Label htmlFor="draft-problem">Problem</Label>
          <Textarea
            id="draft-problem"
            rows={3}
            value={draft.description.problem}
            onChange={(e) =>
              onChange({ ...draft, description: { ...draft.description, problem: e.target.value } })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="draft-scope">Scope</Label>
          <Textarea
            id="draft-scope"
            rows={3}
            value={draft.description.scope}
            onChange={(e) =>
              onChange({ ...draft, description: { ...draft.description, scope: e.target.value } })
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Acceptance criteria</Label>
        <AcceptanceCriteriaList
          items={draft.acceptanceCriteria}
          onChange={(acceptanceCriteria) => onChange({ ...draft, acceptanceCriteria })}
        />
      </div>
    </div>
  );
}
