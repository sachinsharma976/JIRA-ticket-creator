import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuotaStatus } from "@/lib/types";

function formatResetTime(resetsAt: string) {
  const date = new Date(resetsAt);
  return date.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function QuotaIndicator({ quota }: { quota: QuotaStatus | null }) {
  if (!quota) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
        <Gauge className="h-3.5 w-3.5 animate-pulse" />
        Checking quota…
      </div>
    );
  }

  const isExhausted = quota.remaining === 0;
  const isLow = !isExhausted && quota.remaining <= 2;
  const usedFraction = quota.limit > 0 ? Math.min(1, quota.used / quota.limit) : 0;

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-sm",
          isExhausted && "border-destructive/30 text-destructive",
          isLow && "border-amber-500/40 text-amber-600 dark:text-amber-400",
        )}
      >
        <Gauge className="h-3.5 w-3.5 shrink-0" />
        <span>{quota.remaining} of {quota.limit} left today</span>
        <span className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
          <span
            className={cn(
              "block h-full rounded-full bg-primary transition-all",
              isExhausted && "bg-destructive",
              isLow && "bg-amber-500",
            )}
            style={{ width: `${usedFraction * 100}%` }}
          />
        </span>
      </div>
      {isExhausted && (
        <span className="text-xs text-muted-foreground">
          Resets at {formatResetTime(quota.resetsAt)}
        </span>
      )}
    </div>
  );
}
