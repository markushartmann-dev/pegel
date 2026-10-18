import "server-only";
import { prisma } from "./db";
import { auth } from "./auth";

/** Felder des angemeldeten Benutzers, die serverseitig für Autorisierung und Darstellung benötigt werden. */
export const currentUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  role: true,
  status: true,
  timezone: true,
  onboardingCompleted: true,
  themeMode: true,
  colorScheme: true,
  lastActiveAt: true,
  createdAt: true,
} as const;

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "DEACTIVATED";
  timezone: string;
  onboardingCompleted: boolean;
  themeMode: "SYSTEM" | "LIGHT" | "DARK";
  colorScheme: "MIDNIGHT" | "OCEAN" | "FOREST" | "SUNSET" | "LIGHT";
  lastActiveAt: Date | null;
  createdAt: Date;
};

export interface ResolvedSession {
  user: CurrentUser;
  sessionId: string;
  /** Set-Cookie-Header aus einer Sitzungsverlängerung, die an die Antwort angehängt werden müssen */
  responseHeaders: Headers | null;
}

/**
 * Prüft die Sitzung anhand der Request-Header (Cookie) gegen die Datenbank.
 * Deaktivierte Konten werden abgewiesen und ihre Sitzungen gelöscht.
 */
export async function resolveSession(headers: Headers): Promise<ResolvedSession | null> {
  const result = await auth.api.getSession({ headers, returnHeaders: true }).catch(() => null);
  const session = result?.response;
  if (!session?.user) return null;
  const user = (await prisma.user.findUnique({
    where: { id: session.user.id },
    select: currentUserSelect,
  })) as CurrentUser | null;
  if (!user) return null;
  if (user.status !== "ACTIVE") {
    await prisma.session.deleteMany({ where: { userId: user.id } });
    return null;
  }
  return { user, sessionId: session.session.id, responseHeaders: result?.headers ?? null };
}

const ACTIVITY_THROTTLE_MS = 5 * 60_000;

/**
 * Markiert eine echte Benutzeraktivität (Seitenaufruf oder Änderung).
 * Hintergrundanfragen rufen diese Funktion bewusst nicht auf. Gedrosselt auf 1× pro 5 Minuten.
 */
export async function touchActivity(user: Pick<CurrentUser, "id" | "lastActiveAt">) {
  const now = Date.now();
  if (user.lastActiveAt && now - user.lastActiveAt.getTime() < ACTIVITY_THROTTLE_MS) return;
  await prisma.user
    .updateMany({
      where: { id: user.id, OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: new Date(now - ACTIVITY_THROTTLE_MS) } }] },
      data: { lastActiveAt: new Date(now) },
    })
    .catch(() => undefined);
}
