"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth/client";

function AuthLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href as never} className={className}>
      {children}
    </Link>
  );
}

export function NeonAuthUIBoundary({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const navigate = React.useCallback((href: string) => router.push(href as never), [router]);
  const replace = React.useCallback((href: string) => router.replace(href as never), [router]);

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={navigate}
      replace={replace}
      onSessionChange={() => router.refresh()}
      social={{ providers: ["google"] }}
      redirectTo="/dashboard"
      Link={AuthLink}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
