import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadAttachment, JiraError } from "@/lib/jira";
import {
  BLOCKED_ATTACHMENT_EXTENSIONS,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE_BYTES,
  type FailedAttachment,
  type UploadedAttachment,
} from "@/lib/types";

function hasBlockedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return BLOCKED_ATTACHMENT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(request: Request, ctx: RouteContext<"/api/tickets/[jiraKey]/attachments">) {
  const { jiraKey } = await ctx.params;

  // Sanity check: only allow attaching to tickets this app actually created,
  // rather than letting this endpoint upload to an arbitrary Jira issue key.
  const ticket = await prisma.ticket.findUnique({ where: { jiraKey } });
  if (!ticket) {
    return NextResponse.json({ error: `No ticket found for ${jiraKey}.` }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided." }, { status: 400 });
  }
  if (files.length > MAX_ATTACHMENTS) {
    return NextResponse.json({ error: `Too many files (max ${MAX_ATTACHMENTS}).` }, { status: 400 });
  }

  const uploaded: UploadedAttachment[] = [];
  const failed: FailedAttachment[] = [];

  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      failed.push({ filename: file.name, error: "File is too large (max 10MB)." });
      continue;
    }
    if (hasBlockedExtension(file.name)) {
      failed.push({ filename: file.name, error: "File type not allowed." });
      continue;
    }

    try {
      const result = await uploadAttachment(jiraKey, file);
      uploaded.push(result);
    } catch (error) {
      const message = error instanceof JiraError ? error.message : "Upload failed.";
      if (!(error instanceof JiraError)) {
        console.error(`Unexpected error uploading attachment ${file.name} to ${jiraKey}`, error);
      }
      failed.push({ filename: file.name, error: message });
    }
  }

  return NextResponse.json({ uploaded, failed });
}
