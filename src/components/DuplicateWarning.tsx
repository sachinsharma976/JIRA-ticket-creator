"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SimilarIssue } from "@/lib/types";

export function DuplicateWarning({ matches }: { matches: SimilarIssue[] }) {
  const [expanded, setExpanded] = useState(false);

  if (matches.length === 0) return null;

  return (
    <div className="rounded-lg border border-warning/30 bg-warning-bg">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
        <span className="flex-1 text-[13px] font-medium text-warning">
          {matches.length} potentially similar ticket{matches.length > 1 ? "s" : ""} found
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 text-warning transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded && (
        <ul className="space-y-2 border-t border-warning/20 px-3 py-2.5">
          {matches.map((m) => (
            <li key={m.key} className="text-[13px]">
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary hover:underline"
              >
                {m.key} <ExternalLink className="h-3 w-3" />
              </a>
              <p className="text-muted-foreground">
                {m.summary} · {m.status}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
