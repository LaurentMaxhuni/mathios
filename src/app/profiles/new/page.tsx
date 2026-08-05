import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/features/profiles/components/profile-form";

export default function NewProfilePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-7 sm:px-6 lg:py-10">
      <Breadcrumbs current="Create profile" />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Create a local profile</CardTitle>
          <CardDescription>
            The first profile becomes a learner and administrator so the local installation can be
            managed. Additional profiles start as learners.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm mode="create" />
        </CardContent>
      </Card>
      <Link
        href="/profiles"
        className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to profiles
      </Link>
    </div>
  );
}
