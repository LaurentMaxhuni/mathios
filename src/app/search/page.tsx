import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SearchWorkspace } from "@/features/search/components/search-workspace";
import { parseSearchParams, toSearchQuery } from "@/features/search/schemas";
import { searchPlatform } from "@/features/search/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const params = new URLSearchParams();
  const values = await searchParams;
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") params.set(key, value);
    else if (value?.length) params.set(key, value.join(","));
  }
  const parsed = parseSearchParams(params);
  const data = await searchPlatform(
    session.principal.profileId,
    toSearchQuery(parsed),
    session.principal,
  );
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Global search" />
      <div className="mt-7">
        <SearchWorkspace initialData={data} />
      </div>
    </div>
  );
}
