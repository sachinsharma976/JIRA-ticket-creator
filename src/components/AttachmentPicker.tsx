"use client";

import { useRef, useState } from "react";
import { Paperclip, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPicker({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    setError(null);

    const tooBig = Array.from(newFiles).find((f) => f.size > MAX_ATTACHMENT_SIZE_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is over the ${formatSize(MAX_ATTACHMENT_SIZE_BYTES)} limit.`);
      return;
    }

    const combined = [...files, ...Array.from(newFiles)];
    // De-dupe by name+size so re-adding the same file twice doesn't stack it.
    const deduped = combined.filter(
      (f, i) => combined.findIndex((f2) => f2.name === f.name && f2.size === f.size) === i,
    );
    if (deduped.length > MAX_ATTACHMENTS) {
      setError(`Up to ${MAX_ATTACHMENTS} files at a time.`);
    }
    onChange(deduped.slice(0, MAX_ATTACHMENTS));
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${file.size}-${i}`}
              className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-sm"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatSize(file.size)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={() => removeFile(i)}
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {files.length < MAX_ATTACHMENTS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach files
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Up to {MAX_ATTACHMENTS} files, {formatSize(MAX_ATTACHMENT_SIZE_BYTES)} each.
      </p>
    </div>
  );
}
