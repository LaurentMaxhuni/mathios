import { NeonAuthUIBoundary } from "@/features/auth/components/neon-auth-ui-boundary";
import { env } from "@/lib/env";

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (env.AUTH_MODE !== "neon-auth") return children;
  return <NeonAuthUIBoundary>{children}</NeonAuthUIBoundary>;
}
