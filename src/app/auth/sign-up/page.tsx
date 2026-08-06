import { redirect } from "next/navigation";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import { AuthPageFrame } from "@/features/auth/components/auth-page-frame";
import { env } from "@/lib/env";

export default function SignUpPage() {
  if (env.AUTH_MODE !== "neon-auth") redirect("/profiles/new" as never);

  return (
    <AuthPageFrame
      path={authViewPaths.SIGN_UP}
      eyebrow="A clearer way to learn"
      title="Make room for the next idea."
      description="Create your Mathios account and keep the whole science loop within reach."
    />
  );
}
