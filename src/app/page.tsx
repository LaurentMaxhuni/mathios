import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { LearnerDashboard } from "@/features/analytics/components/analytics-ui";
import { getLearnerDashboard } from "@/features/analytics/service";
import { LandingPage } from "@/features/landing/components/landing-page";
import { ProfileDashboard } from "@/features/profiles/components/profile-dashboard";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { env } from "@/lib/env";

export default async function HomePage() {
  const repository = getIdentityRepository();
  const isNeonAuth = env.AUTH_MODE === "neon-auth";
  const primaryHref = isNeonAuth ? "/auth/sign-up" : "/profiles";
  const primaryLabel = isNeonAuth ? "Create account" : "Start learning";
  const signInHref = isNeonAuth ? "/auth/sign-in" : undefined;

  try {
    const session = await getCurrentSession(repository);
    if (session) {
      const onboarding = await repository.getOnboarding(session.principal.profileId);
      const learnerDashboard = await getLearnerDashboard(
        session.principal.profileId,
        getAnalyticsRepository(),
      ).catch(() => null);
      return (
        <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
          <Breadcrumbs current="Overview" />
          <div className="mt-6">
            <ProfileDashboard principal={session.principal} onboarding={onboarding} />
            {learnerDashboard ? <LearnerDashboard data={learnerDashboard} /> : null}
          </div>
        </div>
      );
    }

    return (
      <LandingPage primaryHref={primaryHref} primaryLabel={primaryLabel} signInHref={signInHref} />
    );
  } catch {
    return (
      <LandingPage primaryHref={primaryHref} primaryLabel={primaryLabel} signInHref={signInHref} />
    );
  }
}
