import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { logger } from "@/lib/logger";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mathios · Science workspace",
    template: "%s · Mathios",
  },
  description: "A local-first science learning platform.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let principal = null;
  let settings = null;
  try {
    const repository = getIdentityRepository();
    const session = await getCurrentSession(repository);
    principal = session?.principal ?? null;
    settings = principal ? await repository.getSettings(principal.profileId) : null;
  } catch (error) {
    logger.warn("Identity context is unavailable until Phase 1 migrations run", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <AppShell principal={principal} settings={settings}>
            {children}
          </AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
