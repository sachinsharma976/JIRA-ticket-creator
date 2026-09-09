import { AlertCircle } from "lucide-react";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-bg px-4 py-3 text-[13px] text-danger">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
