import { NextResponse } from "next/server";
import { clearRecentSearches, recentSearches } from "@/features/search/service";
import { requireSearchProfile, searchErrorResponse } from "@/features/search/route-utils";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const { profileId } = await requireSearchProfile();
    return NextResponse.json({ recentSearches: await recentSearches(profileId) });
  } catch (error) {
    return searchErrorResponse(error);
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    const { profileId } = await requireSearchProfile();
    await clearRecentSearches(profileId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return searchErrorResponse(error);
  }
}
