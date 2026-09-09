import { NextResponse } from "next/server";
import { getActiveSprint, JiraError } from "@/lib/jira";

export async function GET() {
  try {
    const sprint = await getActiveSprint();
    return NextResponse.json({ sprint: { id: sprint.id, name: sprint.name } });
  } catch (error) {
    if (error instanceof JiraError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("Unexpected error fetching active sprint", error);
    return NextResponse.json({ error: "Something went wrong fetching the active sprint." }, { status: 500 });
  }
}
