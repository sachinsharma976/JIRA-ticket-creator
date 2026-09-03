import { AlertCircle } from "lucide-react";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
