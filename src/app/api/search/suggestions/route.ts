import { NextResponse } from "next/server";
import { searchSuggestions } from "@/features/search/service";
import { requireSearchProfile, searchErrorResponse } from "@/features/search/route-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { profileId } = await requireSearchProfile();
    const query = new URL(request.url).searchParams.get("q") ?? "";
    return NextResponse.json(
      { suggestions: await searchSuggestions(profileId, query) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return searchErrorResponse(error);
  }
}
