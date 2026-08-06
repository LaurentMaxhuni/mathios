import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getNotesRepository } from "@/infrastructure/database/repositories/notes-repository";
import { getNotesDashboard, getPersonalKnowledgeMap } from "@/features/notes/service";
import { NotesWorkspace } from "@/features/notes/components/notes-workspace";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const repository = getNotesRepository();
  const [dashboard, map] = await Promise.all([
    getNotesDashboard(session.principal.profileId, repository),
    getPersonalKnowledgeMap(session.principal.profileId, repository),
  ]);
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Personal knowledge base" />
      <div className="mt-7">
        <NotesWorkspace initialDashboard={dashboard} initialMap={map} />
      </div>
    </div>
  );
}
