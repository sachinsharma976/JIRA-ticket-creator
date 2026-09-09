import { NextResponse } from "next/server";
import { z } from "zod";
import { searchSimilarIssues, JiraError } from "@/lib/jira";

const bodySchema = z.object({ title: z.string().min(1) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  try {
    const matches = await searchSimilarIssues(parsed.data.title);
    return NextResponse.json({ matches });
  } catch (error) {
    if (error instanceof JiraError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("Unexpected error searching for similar issues", error);
    return NextResponse.json({ error: "Something went wrong checking for duplicates." }, { status: 500 });
  }
}
