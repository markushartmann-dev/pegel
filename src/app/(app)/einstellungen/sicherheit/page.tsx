import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireOnboardedUser } from "@/server/page-auth";
import { resolveSession } from "@/server/current-user";
import { listOwnSessions } from "@/server/services/account";
import { env } from "@/server/env";
import { SecuritySettings } from "@/features/settings/security-settings";

export const metadata: Metadata = { title: "Sicherheit" };

export default async function SecurityPage() {
  const user = await requireOnboardedUser();
  const resolved = await resolveSession(await headers());
  const sessions = await listOwnSessions(user, resolved?.sessionId ?? "");
  return (
    <SecuritySettings
      timezone={user.timezone}
      sessionDays={env.sessionMaxAgeDays}
      sessions={sessions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString(), expiresAt: s.expiresAt.toISOString() }))}
    />
  );
}
