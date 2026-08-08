"use client";

import { AccountView } from "@neondatabase/auth-ui";

export function AccountViewClient({ path }: { path: string }) {
  return <AccountView path={path} />;
}
