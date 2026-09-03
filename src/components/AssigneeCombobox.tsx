"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2, UserRound } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { AssignableUser } from "@/lib/types";

export function AssigneeCombobox({
  value,
  onChange,
}: {
  value: { accountId: string; displayName: string } | null;
  onChange: (user: { accountId: string; displayName: string } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      fetch(`/api/tickets/users?q=${encodeURIComponent(query)}`)
        .then((res) => (res.ok ? res.json() : { users: [] }))
        .then((data) => {
          if (!cancelled) setUsers(data.users ?? []);
        })
        .catch(() => {
          if (!cancelled) setUsers([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [open, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-lg border border-input bg-background px-2.5 text-sm",
          "hover:bg-muted",
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          {value ? value.displayName : <span className="text-muted-foreground">Unassigned</span>}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search people…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
              </div>
            )}
            {!loading && <CommandEmpty>No matching people.</CommandEmpty>}
            <CommandGroup>
              <CommandItem
                value="__unassigned__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("h-4 w-4", value ? "opacity-0" : "opacity-100")} />
                Unassigned
              </CommandItem>
              {users.map((user) => (
                <CommandItem
                  key={user.accountId}
                  value={user.accountId}
                  onSelect={() => {
                    onChange({ accountId: user.accountId, displayName: user.displayName });
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value?.accountId === user.accountId ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {user.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt="" className="h-5 w-5 rounded-full" />
                  )}
                  {user.displayName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
