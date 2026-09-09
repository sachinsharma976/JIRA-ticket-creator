import { AlertTriangle, ExternalLink } from "lucide-react";
import type { SimilarIssue } from "@/lib/types";

export function DuplicateWarning({ matches }: { matches: SimilarIssue[] }) {
  if (matches.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Possibly similar tickets already exist
      </p>
      <ul className="space-y-1">
        {matches.map((m) => (
          <li key={m.key} className="text-sm">
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-amber-800 hover:underline dark:text-amber-300"
            >
              {m.key} <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-muted-foreground"> — {m.summary} ({m.status})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
