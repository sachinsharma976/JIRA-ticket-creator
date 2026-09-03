import { NextResponse } from "next/server";
import { getAssignableUsers, JiraError } from "@/lib/jira";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || undefined;

  try {
    const users = await getAssignableUsers(query);
    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof JiraError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("Unexpected error fetching assignable users", error);
    return NextResponse.json({ error: "Something went wrong fetching users." }, { status: 500 });
  }
}
