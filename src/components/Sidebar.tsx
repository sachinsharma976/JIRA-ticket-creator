"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, LayoutList } from "lucide-react";
import appLogo from "@/assets/jira-ticket-creator.png";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuota } from "@/components/QuotaProvider";

// Add new routes here as features ship — the sidebar picks them up
// automatically, nothing else needs to change.
const NAV_ITEMS = [
  { href: "/", label: "Create Ticket", icon: Sparkles },
  { href: "/tickets", label: "Tickets", icon: LayoutList },
];

export function Sidebar() {
  const pathname = usePathname();
  const { quota } = useQuota();
  const [sprintName, setSprintName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tickets/sprint")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.sprint) setSprintName(data.sprint.name);
      })
      .catch(() => {
        // Sprint name is a nicety in the sidebar; failures just hide it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const usagePct = quota && quota.limit > 0 ? Math.min(100, (quota.used / quota.limit) * 100) : 0;

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md">
          <Image src={appLogo} alt="Ticket Creator" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold leading-tight text-foreground">Ticket Creator</span>
          <Badge variant="secondary" className="h-[18px] rounded-full px-1.5 text-[10px] font-medium">
            Beta
          </Badge>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t px-4 py-4">
        {sprintName && (
          <p className="truncate text-[13px] font-medium text-foreground">{sprintName}</p>
        )}

        <div className="space-y-1.5">
          <p className="text-[12px] text-muted-foreground">AI usage</p>
          <p className="text-[13px] font-medium text-foreground">
            {quota ? `${quota.used} / ${quota.limit} tickets` : "—"}
          </p>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                quota && quota.remaining === 0 ? "bg-danger" : "bg-primary",
              )}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

// Below the sidebar's breakpoint there's otherwise no way to navigate at
// all — this is the mobile equivalent, a slim top bar with the same links.
export function MobileNav() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b bg-sidebar px-4 py-2.5 md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md">
          <Image src={appLogo} alt="Ticket Creator" />
        </div>
        <span className="text-[13px] font-semibold text-foreground">Ticket Creator</span>
      </div>
      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors",
                active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
