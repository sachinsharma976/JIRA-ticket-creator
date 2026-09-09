"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, History } from "lucide-react";
import appLogo from "@/assets/jira-ticket-creator.png";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Add new routes here as features ship — the sidebar picks them up
// automatically, nothing else needs to change.
const NAV_ITEMS = [
  { href: "/", label: "Create Ticket", icon: Sparkles },
  { href: "/tickets", label: "History", icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-background md:flex">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
          <Image src={appLogo} alt="Jira Ticket Creator" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold leading-tight">Ticket Creator</span>
          <Badge variant="secondary" className="text-[0.65rem]">
            Beta
          </Badge>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
