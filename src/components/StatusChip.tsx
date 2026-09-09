import { cn } from "@/lib/utils";
import type { TicketHistoryItem } from "@/lib/types";

const CHIP_COLORS = {
  gray: "bg-muted text-muted-foreground",
  blue: "bg-accent text-primary",
  purple: "bg-purple-bg text-purple",
  amber: "bg-warning-bg text-warning",
  green: "bg-success-bg text-success",
  red: "bg-danger-bg text-danger",
} as const;

// Jira workflow status names are fully custom per instance, so exact-name
// semantic coloring is inherently a best-effort keyword match — falls back
// to Jira's own (coarser) status category when nothing matches.
function colorForLiveStatus(name: string, category: string): keyof typeof CHIP_COLORS {
  const lower = name.toLowerCase();
  if (lower.includes("done") || lower.includes("closed") || lower.includes("resolved")) return "green";
  if (lower.includes("review")) return "purple";
  if (lower.includes("staging") || lower.includes("deploy")) return "amber";
  if (lower.includes("progress")) return "blue";
  if (lower.includes("backlog") || lower.includes("to do") || lower.includes("todo")) return "gray";

  if (category === "done") return "green";
  if (category === "indeterminate") return "blue";
  return "gray";
}

export function statusChipInfo(item: TicketHistoryItem): { label: string; color: keyof typeof CHIP_COLORS } {
  if (item.status === "FAILED") return { label: "Failed to create", color: "red" };
  if (item.status === "PENDING") return { label: "Incomplete", color: "gray" };
  if (item.liveStatus) {
    return { label: item.liveStatus.name, color: colorForLiveStatus(item.liveStatus.name, item.liveStatus.category) };
  }
  return { label: "Created", color: "gray" };
}

export function StatusChip({ label, color }: { label: string; color: keyof typeof CHIP_COLORS }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2 text-[11px] font-medium",
        CHIP_COLORS[color],
      )}
    >
      {label}
    </span>
  );
}
