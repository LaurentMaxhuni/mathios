import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import { AppShell } from "@/components/layout/app-shell";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mathios · Science workspace",
    template: "%s · Mathios",
  },
  description: "A local-first science learning platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
