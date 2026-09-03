import { NextResponse } from "next/server";
import { draftRequestSchema } from "@/lib/types";
import { generateTicketDraft, LlmError } from "@/lib/llm";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = draftRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const draft = await generateTicketDraft(parsed.data.context, {
      issueType: parsed.data.issueType,
    });
    return NextResponse.json({ draft });
  } catch (error) {
    if (error instanceof LlmError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("Unexpected error generating ticket draft", error);
    return NextResponse.json({ error: "Something went wrong generating the draft." }, { status: 500 });
  }
}
