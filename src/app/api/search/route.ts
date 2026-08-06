import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { parseSearchParams, toSearchQuery } from "@/features/search/schemas";
import { searchPlatform } from "@/features/search/service";
import { requireSearchProfile, searchErrorResponse } from "@/features/search/route-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { profileId, principal } = await requireSearchProfile();
    const parsed = parseSearchParams(new URL(request.url).searchParams);
    const data = await searchPlatform(profileId, toSearchQuery(parsed), principal);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { message: "Invalid search filters.", issues: error.issues },
        { status: 400 },
      );
    return searchErrorResponse(error);
  }
}
