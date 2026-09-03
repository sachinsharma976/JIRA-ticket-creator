import { Check, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export function SuccessCard({
  jiraKey,
  jiraUrl,
  onReset,
}: {
  jiraKey: string;
  jiraUrl: string;
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
