import "server-only";
import { prisma } from "./db";
import type { AuditSeverity, Prisma } from "@/generated/prisma/client";

/**
 * Aktivitäts- und Sicherheitsprotokoll.
 * Regeln: keine Passwörter, Tokens, Session-IDs oder Konsumdetails protokollieren.
 * IP-Adressen werden gekürzt (IPv4: letztes Oktett, IPv6: letzte 80 Bit entfernt).
 */
export type AuditAction =
  | "auth.register"
  | "auth.login"
  | "auth.login_failed"
  | "auth.login_blocked"
  | "auth.logout"
  | "auth.password_changed"
  | "auth.password_reset_requested"
  | "auth.password_reset"
  | "auth.email_verified"
  | "auth.sessions_revoked"
  | "profile.onboarding_completed"
  | "profile.updated"
  | "settings.updated"
  | "community.updated"
  | "consent.updated"
  | "beverage.created"
  | "beverage.updated"
  | "beverage.archived"
  | "beverage.restored"
  | "entry.created"
  | "entry.updated"
  | "entry.deleted"
  | "push.subscribed"
  | "push.unsubscribed"
  | "push.subscription_removed"
  | "account.exported"
  | "account.deleted"
  | "admin.user_status_changed"
  | "admin.user_role_changed"
  | "admin.sessions_revoked"
  | "admin.user_deleted"
  | "admin.user_created"
  | "admin.reset_link_created"
  | "admin.default_beverage_changed"
  | "security.csrf_blocked"
  | "security.rate_limited"
  | "security.forbidden"
  | "system.error"
  | "system.started";

export function truncateIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const v = ip.trim().replace(/^::ffff:/, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return v.replace(/\.\d{1,3}$/, ".0");
  if (v.includes(":")) {
    const parts = v.split(":").slice(0, 3);
    return `${parts.join(":")}::`;
  }
  return null;
}

export function requestMeta(headers: Headers | null | undefined) {
  if (!headers) return { ipAddress: null, userAgent: null };
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = headers.get("cf-connecting-ip") || headers.get("x-real-ip") || fwd || null;
  const ua = headers.get("user-agent");
  return { ipAddress: truncateIp(ip), userAgent: ua ? ua.slice(0, 200) : null };
}

const FORBIDDEN_KEYS = /pass(word)?|token|secret|session|cookie|authorization|hash/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[…]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitize(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = FORBIDDEN_KEYS.test(k) ? "[entfernt]" : sanitize(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string") return value.slice(0, 300);
  return value;
}

export interface AuditInput {
  action: AuditAction;
  severity?: AuditSeverity;
  actorId?: string | null;
  targetUserId?: string | null;
  entityType?: string;
  entityId?: string;
  headers?: Headers | null;
  metadata?: Record<string, unknown>;
}

export async function audit(input: AuditInput, tx: Prisma.TransactionClient = prisma): Promise<void> {
  const meta = requestMeta(input.headers);
  try {
    await tx.auditLog.create({
      data: {
        action: input.action,
        severity: input.severity ?? "INFO",
        actorId: input.actorId ?? null,
        targetUserId: input.targetUserId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: input.metadata ? (sanitize(input.metadata) as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    // Protokollierung darf die eigentliche Aktion nicht verhindern – aber im Log sichtbar sein.
    if (tx !== prisma) throw err;
    console.error("[audit] Schreiben fehlgeschlagen:", (err as Error).message);
  }
}
