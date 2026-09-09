import { NextResponse } from "next/server";
import { createTicketSchema } from "@/lib/types";
import { createTicketInActiveSprint, JiraError } from "@/lib/jira";
import { getQuotaStatus, markTicketCreated, markTicketFailed, QuotaExceededError, reserveTicketSlot } from "@/lib/rateLimit";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const draft = parsed.data;

  let reservation;
  try {
    reservation = await reserveTicketSlot({
      title: draft.title,
      issueType: draft.issueType,
      assigneeAccountId: draft.assigneeAccountId,
      assigneeName: draft.assigneeName,
      priority: draft.priority,
      dueDate: draft.dueDate,
    });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      const quota = await getQuotaStatus();
      return NextResponse.json(
        { error: error.message, ...quota },
        { status: 429 },
      );
    }
    console.error("Unexpected error reserving ticket slot", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  try {
    const { jiraKey, jiraUrl, startDate } = await createTicketInActiveSprint(draft, draft.issueType, {
      assigneeAccountId: draft.assigneeAccountId,
      priority: draft.priority,
      dueDate: draft.dueDate,
    });
    await markTicketCreated(reservation.id, jiraKey, jiraUrl, startDate);
    const quota = await getQuotaStatus();
    return NextResponse.json({ jiraKey, jiraUrl, quota }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof JiraError ? error.message : "Failed to create the ticket in Jira. Please try again.";
    await markTicketFailed(reservation.id, message).catch((e) =>
      console.error("Failed to mark ticket as failed", e),
    );
    if (!(error instanceof JiraError)) {
      console.error("Unexpected error creating Jira ticket", error);
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
