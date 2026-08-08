import { redirect } from "next/navigation";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) return redirect("/profiles");
  return redirect("/progress");
}
