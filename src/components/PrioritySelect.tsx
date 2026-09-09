"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { IssueType, JiraPriority } from "@/lib/types";

export function PrioritySelect({
  issueType,
  value,
  onChange,
}: {
  issueType: IssueType;
  value: string;
  onChange: (priority: string) => void;
}) {
  const [priorities, setPriorities] = useState<JiraPriority[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tickets/priorities?issueType=${encodeURIComponent(issueType)}`)
      .then((res) => (res.ok ? res.json() : { priorities: [] }))
      .then((data) => {
        if (!cancelled) setPriorities(data.priorities ?? []);
      })
      .catch(() => {
        if (!cancelled) setPriorities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [issueType]);

  if (priorities.length === 0) {
    return null;
  }

  return (
    <Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger className="w-full bg-background">
        <SelectValue placeholder="Default" />
      </SelectTrigger>
      <SelectContent>
        {priorities.map((p) => (
          <SelectItem key={p.id} value={p.name}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
