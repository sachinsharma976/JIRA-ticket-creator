import { NextResponse } from "next/server";
import { getAllowedPriorities, JiraError } from "@/lib/jira";
import { issueTypeEnum } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = issueTypeEnum.safeParse(searchParams.get("issueType"));
  const issueType = parsed.success ? parsed.data : "Task";

  try {
    const priorities = await getAllowedPriorities(issueType);
    return NextResponse.json({ priorities });
  } catch (error) {
    if (error instanceof JiraError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("Unexpected error fetching priorities", error);
    return NextResponse.json({ error: "Something went wrong fetching priorities." }, { status: 500 });
  }
}
