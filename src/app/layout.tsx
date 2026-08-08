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
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Mathios - Daily science learning",
    template: "%s - Mathios",
  },
  description:
    "A calm daily learning app for mathematics, physics, chemistry, biology, and astronomy.",
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
  openGraph: {
    title: "Mathios - Daily science learning",
    description:
      "A calm daily learning app for mathematics, physics, chemistry, biology, and astronomy.",
    type: "website",
    images: [
      {
        url: "/landing/mathios-hero-spatial.png",
        alt: "Translucent geometric forms arranged on a midnight-blue plinth",
      },
    ],
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
