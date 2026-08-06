import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import "@/styles/globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mathios · Science workspace",
    template: "%s · Mathios",
  },
  description: "A connected science learning workspace for concepts, practice, and experiments.",
  icons: {
    icon: [
      {
        url: "/brand/mathios-logo.png",
        type: "image/png",
        sizes: "768x768",
      },
    ],
    apple: "/brand/mathios-logo.png",
  },
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
    logger.warn("Application context is unavailable until database migrations run", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="antialiased">
        <AppProviders>
          <AppShell authMode={env.AUTH_MODE} principal={principal} settings={settings}>
            {children}
          </AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
