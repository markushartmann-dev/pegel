import { randomUUID } from "node:crypto";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { resetRateLimits } from "@/server/rate-limit";
import { DEFAULT_BEVERAGES } from "@/lib/default-beverages";
import { alcoholGrams, roundGrams } from "@/lib/calculations/alcohol";

export const ORIGIN = "http://localhost:3000";

type Handler<P> = (req: Request, ctx: { params: Promise<P> }) => Promise<Response>;

export interface TestUser {
  id: string;
  email: string;
  password: string;
  cookie: string;
}

/** Extrahiert "name=value" aller Set-Cookie-Header zu einem Cookie-Header. */
export function cookieFrom(res: Response): string {
  const all = res.headers.getSetCookie();
  return all.map((c) => c.split(";")[0]).filter((c) => !c.endsWith("=")).join("; ");
}

export async function authRequest(pathname: string, body: unknown, cookie?: string) {
  return auth.handler(
    new Request(`${ORIGIN}/api/auth${pathname}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }),
  );
}

export async function signUp(opts: { email?: string; password?: string; name?: string } = {}): Promise<TestUser> {
  const email = opts.email ?? `user-${randomUUID().slice(0, 8)}@example.test`;
  const password = opts.password ?? "sehr-sicheres-passwort";
  const res = await authRequest("/sign-up/email", { email, password, name: opts.name ?? "Test", timezone: "Europe/Berlin" });
  if (!res.ok) throw new Error(`Sign-up fehlgeschlagen: ${res.status} ${await res.text()}`);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { id: user.id, email, password, cookie: cookieFrom(res) };
}

export async function signIn(email: string, password: string, rememberMe = true) {
  return authRequest("/sign-in/email", { email, password, rememberMe });
}

/** Registriert und schließt das Onboarding direkt in der DB ab. */
export async function onboardedUser(opts: { email?: string } = {}): Promise<TestUser> {
  const u = await signUp(opts);
  await prisma.$transaction([
    prisma.userProfile.create({ data: { userId: u.id, distributionModel: "WIDMARK_MALE", weightKg: 80, heightCm: 180 } }),
    prisma.userProfileRevision.create({ data: { userId: u.id, distributionModel: "WIDMARK_MALE", weightKg: 80, heightCm: 180, validFrom: new Date(Date.now() - 365 * 86_400_000) } }),
    prisma.user.update({ where: { id: u.id }, data: { onboardingCompleted: true } }),
  ]);
  return u;
}

export async function makeAdmin(u: TestUser) {
  await prisma.user.update({ where: { id: u.id }, data: { role: "ADMIN" } });
}

export async function call<P = Record<string, never>>(
  handler: Handler<P>,
  opts: { method?: string; path?: string; body?: unknown; cookie?: string; params?: P; origin?: string | null; query?: Record<string, string> } = {},
) {
  const url = new URL(`${ORIGIN}${opts.path ?? "/api/test"}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.origin !== null) headers.origin = opts.origin ?? ORIGIN;
  headers.host = "localhost:3000";
  const res = await handler(
    new Request(url, { method: opts.method ?? "GET", headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }),
    { params: Promise.resolve((opts.params ?? {}) as P) },
  );
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json: json as Record<string, unknown> & { error?: string }, res };
}

export async function resetDb() {
  resetRateLimits();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rateLimit.deleteMany();
  await prisma.verification.deleteMany();
  // Standardgetränke auf Seed-Werte zurücksetzen (Admin-Tests dürfen sie ändern)
  for (const b of DEFAULT_BEVERAGES) {
    await prisma.beverage.updateMany({
      where: { ownerId: null, isDefault: true, name: b.name },
      data: { volumeMl: b.volumeMl, abv: b.abv, alcoholGrams: roundGrams(alcoholGrams(b.volumeMl, b.abv)), isActive: true },
    });
  }
}

export const beverageId = async (name: string) => (await prisma.beverage.findFirstOrThrow({ where: { name, ownerId: null } })).id;
