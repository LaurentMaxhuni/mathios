import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleAssignmentForm } from "@/features/auth/components/role-assignment-form";
import { hasPermission } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";

export default async function RolesPage() {
  const repository = getIdentityRepository();
  const session = await getCurrentSession(repository).catch(() => null);
  if (!session) redirect("/profiles");
  if (!hasPermission(session.principal, "manage_users"))
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <Breadcrumbs current="Roles" />
        <div className="mt-6">
          <ErrorState
            title="Administrator permission required"
            description="Only a profile with the manage-users permission can change local roles."
          />
        </div>
      </div>
    );
  const [profiles, roles] = await Promise.all([
    repository.listProfilesWithRoles(),
    repository.listRoles(),
  ]);
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Roles" />
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Permissions</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Role management</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Assign one or more roles to local profiles. The last administrator cannot remove their own
          administrator access.
        </p>
      </div>
      <Card className="mt-7">
        <CardHeader>
          <CardTitle>Permission catalog</CardTitle>
          <CardDescription>
            Learner access is the default. Higher roles unlock capabilities without changing profile
            data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {roles.map((role) => (
              <div key={role.slug} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{role.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="mt-5 space-y-4">
        {profiles.map((profile) => (
          <RoleAssignmentForm key={profile.id} profile={profile} roles={roles} />
        ))}
      </div>
    </div>
  );
}
