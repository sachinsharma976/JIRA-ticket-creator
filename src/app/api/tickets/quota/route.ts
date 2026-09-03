import { NextResponse } from "next/server";
import { getQuotaStatus } from "@/lib/rateLimit";

export async function GET() {
  try {
    const quota = await getQuotaStatus();
    return NextResponse.json(quota);
  } catch (error) {
    console.error("Unexpected error fetching quota", error);
    return NextResponse.json({ error: "Something went wrong fetching quota." }, { status: 500 });
  }
}
