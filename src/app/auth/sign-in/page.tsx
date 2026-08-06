import { authViewPaths } from "@neondatabase/auth-ui/server";
import { AuthPageFrame } from "@/features/auth/components/auth-page-frame";
import { LocalSignInPage } from "@/features/auth/components/local-sign-in-page";
import { env } from "@/lib/env";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string; created?: string }>;
}) {
  if (env.AUTH_MODE !== "neon-auth") {
    const { profileId, created } = await searchParams;
    return <LocalSignInPage profileId={profileId} created={created} />;
  }

  return (
    <AuthPageFrame
      path={authViewPaths.SIGN_IN}
      eyebrow="Return to the thread"
      title="Pick up where you left off."
      description="Your concepts, practice, and experiments stay in one connected workspace."
    />
  );
}
