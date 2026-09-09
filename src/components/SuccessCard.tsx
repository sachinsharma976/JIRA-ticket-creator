import { Check, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { FailedAttachment, UploadedAttachment } from "@/lib/types";

export function SuccessCard({
  jiraKey,
  jiraUrl,
  hasAttachments,
  attachmentResult,
  onReset,
}: {
  jiraKey: string;
  jiraUrl: string;
  hasAttachments: boolean;
  attachmentResult: { uploaded: UploadedAttachment[]; failed: FailedAttachment[] } | null;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-card px-6 py-12 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600/10">
        <Check className="h-6 w-6 text-green-600" strokeWidth={2.5} />
      </div>
      <div className="space-y-1">
        <p className="font-medium">
          Ticket{" "}
          <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm font-semibold">
            {jiraKey}
          </span>{" "}
          created in the active sprint
        </p>
        <p className="text-sm text-muted-foreground">You can find it in Jira now.</p>
      </div>

      {hasAttachments && (
        <div className="text-sm">
          {!attachmentResult ? (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading attachments…
            </p>
          ) : attachmentResult.failed.length === 0 ? (
            <p className="text-muted-foreground">
              {attachmentResult.uploaded.length} attachment{attachmentResult.uploaded.length > 1 ? "s" : ""} uploaded.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-1 text-amber-600 dark:text-amber-400">
              <p className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {attachmentResult.uploaded.length} of{" "}
                {attachmentResult.uploaded.length + attachmentResult.failed.length} attachments uploaded
              </p>
              <ul className="text-xs">
                {attachmentResult.failed.map((f) => (
                  <li key={f.filename}>
                    {f.filename}: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <a
          href={jiraUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "default", className: "gap-2" })}
        >
          Open in Jira <ExternalLink className="h-4 w-4" />
        </a>
        <Button variant="outline" onClick={onReset}>
          Create another
        </Button>
      </div>
    </div>
  );
}
