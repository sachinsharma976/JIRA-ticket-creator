"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { QuotaStatus } from "@/lib/types";

interface QuotaContextValue {
  quota: QuotaStatus | null;
  setQuota: (quota: QuotaStatus) => void;
  refreshQuota: () => Promise<void>;
}

const QuotaContext = createContext<QuotaContextValue | null>(null);

export function QuotaProvider({ children }: { children: React.ReactNode }) {
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  async function refreshQuota() {
    try {
      const res = await fetch("/api/tickets/quota");
      if (res.ok) setQuota(await res.json());
    } catch {
      // Quota display is best-effort; the server still enforces the limit.
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tickets/quota")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setQuota(data);
      })
      .catch(() => {
        // Quota display is best-effort; the server still enforces the limit.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <QuotaContext.Provider value={{ quota, setQuota, refreshQuota }}>{children}</QuotaContext.Provider>;
}

export function useQuota() {
  const ctx = useContext(QuotaContext);
  if (!ctx) throw new Error("useQuota must be used within a QuotaProvider");
  return ctx;
}
