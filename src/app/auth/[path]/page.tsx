import { notFound } from "next/navigation";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import { AuthPageFrame } from "@/features/auth/components/auth-page-frame";
import { LocalSignInPage } from "@/features/auth/components/local-sign-in-page";
import { env } from "@/lib/env";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ path: string }> {
  return Object.values(authViewPaths)
    .filter((path) => path !== authViewPaths.SIGN_IN && path !== authViewPaths.SIGN_UP)
    .map((path) => ({ path }));
}

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ profileId?: string; created?: string }>;
}) {
  const { path } = await params;
  if (env.AUTH_MODE === "neon-auth") {
    return (
      <AuthPageFrame
        path={path}
        eyebrow="Keep the thread connected"
        title="Stay close to the idea."
        description="Mathios keeps account recovery and the learning workspace in the same calm place."
      />
    );
  }

  if (path !== "sign-in") notFound();
  const { profileId, created } = await searchParams;
  return <LocalSignInPage profileId={profileId} created={created} />;
}
