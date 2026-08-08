import { LandingPage } from "@/features/landing/components/landing-page";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { env } from "@/lib/env";

export default async function HomePage() {
  const repository = getIdentityRepository();
  const isNeonAuth = env.AUTH_MODE === "neon-auth";
  const session = await getCurrentSession(repository).catch(() => null);
  const primaryHref = session ? "/dashboard" : isNeonAuth ? "/auth/sign-up" : "/profiles";
  const primaryLabel = session ? "Open dashboard" : isNeonAuth ? "Create account" : "Start learning";
  const signInHref = session || !isNeonAuth ? undefined : "/auth/sign-in";

  return (
    <LandingPage primaryHref={primaryHref} primaryLabel={primaryLabel} signInHref={signInHref} />
  );
}
