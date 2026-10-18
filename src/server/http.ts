import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError, badRequest, forbidden, tooManyRequests, unauthorized } from "./errors";
import { resolveSession, touchActivity, type CurrentUser } from "./current-user";
import { audit, requestMeta } from "./audit";
import { env } from "./env";
import { rateLimit } from "./rate-limit";
import { fieldErrors } from "@/lib/validation";

/**
 * Gemeinsamer Wrapper für alle Route Handlers unter /api/v1:
 *  - Sitzungsprüfung gegen die Datenbank (inkl. Rollenprüfung)
 *  - CSRF-Schutz für ändernde Methoden (Origin/Sec-Fetch-Site)
 *  - Rate-Limits
 *  - zentrale Fehlerbehandlung ohne interne Details
 *  - Cache-Control: no-store (private Daten werden nie zwischengespeichert)
 */
type Access = "public" | "user" | "onboarded" | "admin";

interface Options {
  access: Access;
  rateLimit?: { name: string; max: number; windowMs: number };
  /** Änderung zählt als Benutzeraktivität (Standard: bei ändernden Methoden) */
  activity?: boolean;
}

export interface HandlerContext<P> {
  req: Request;
  params: P;
  user: CurrentUser;
  sessionId: string;
  /** JSON-Body lesen und mit Zod validieren */
  body<T>(schema: ZodType<T>): Promise<T>;
  query<T>(schema: ZodType<T>): T;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const trusted = new Set(
  [env.appUrl, ...(process.env.TRUSTED_ORIGINS ?? "").split(",")]
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean),
);

export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (origin) {
    if (trusted.has(origin)) return true;
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    try {
      return !!host && new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return req.headers.get("sec-fetch-site") === "same-origin";
}

function clientKey(req: Request, user?: CurrentUser | null) {
  if (user) return `u:${user.id}`;
  return `ip:${requestMeta(req.headers).ipAddress ?? "unknown"}`;
}

export function json(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export function errorResponse(err: unknown, req?: Request, user?: CurrentUser | null): NextResponse {
  if (err instanceof AppError) {
    return json({ error: err.message, code: err.code, fields: err.fields }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const fields = fieldErrors(err);
    return json({ error: Object.values(fields)[0] ?? "Ungültige Eingabe.", code: "VALIDATION", fields }, { status: 400 });
  }
  const id = crypto.randomUUID().slice(0, 8);
  console.error(`[api] Fehler ${id} ${req?.method ?? ""} ${req ? new URL(req.url).pathname : ""}:`, err);
  void audit({
    action: "system.error",
    severity: "ERROR",
    actorId: user?.id ?? null,
    headers: req?.headers,
    metadata: { ref: id, path: req ? new URL(req.url).pathname : undefined, method: req?.method, name: (err as Error)?.name },
  });
  return json({ error: `Unerwarteter Fehler (Referenz ${id}). Bitte später erneut versuchen.`, code: "INTERNAL" }, { status: 500 });
}

type RouteParams<P> = { params: Promise<P> };

export function route<P = Record<string, never>>(
  options: Options,
  handler: (ctx: HandlerContext<P>) => Promise<unknown>,
) {
  return async (req: Request, routeCtx: RouteParams<P>): Promise<Response> => {
    let user: CurrentUser | null = null;
    try {
      const mutating = MUTATING.has(req.method);
      if (mutating && !isSameOrigin(req)) {
        await audit({ action: "security.csrf_blocked", severity: "SECURITY", headers: req.headers, metadata: { path: new URL(req.url).pathname } });
        throw forbidden("Anfrage von fremder Herkunft abgelehnt.");
      }

      let sessionId = "";
      let cookieHeaders: Headers | null = null;
      if (options.access !== "public") {
        const resolved = await resolveSession(req.headers);
        if (!resolved) throw unauthorized();
        user = resolved.user;
        sessionId = resolved.sessionId;
        cookieHeaders = resolved.responseHeaders;
        if (options.access === "onboarded" && !user.onboardingCompleted) {
          throw new AppError(409, "Bitte zuerst die Einrichtung abschließen.", "ONBOARDING_REQUIRED");
        }
        if (options.access === "admin" && user.role !== "ADMIN") {
          await audit({ action: "security.forbidden", severity: "SECURITY", actorId: user.id, headers: req.headers, metadata: { path: new URL(req.url).pathname } });
          throw forbidden();
        }
      }

      if (options.rateLimit) {
        const rl = rateLimit(`${options.rateLimit.name}:${clientKey(req, user)}`, options.rateLimit.max, options.rateLimit.windowMs);
        if (!rl.ok) {
          await audit({ action: "security.rate_limited", severity: "WARNING", actorId: user?.id, headers: req.headers, metadata: { name: options.rateLimit.name } });
          const res = errorResponse(tooManyRequests());
          res.headers.set("Retry-After", String(rl.retryAfter));
          return res;
        }
      }

      if (user && (options.activity ?? mutating)) await touchActivity(user);

      const params = (await routeCtx?.params) ?? ({} as P);
      const url = new URL(req.url);
      const ctx: HandlerContext<P> = {
        req,
        params,
        user: user as CurrentUser,
        sessionId,
        async body<T>(schema: ZodType<T>) {
          let data: unknown;
          try {
            data = await req.json();
          } catch {
            throw badRequest("Ungültiger JSON-Body.");
          }
          return schema.parse(data);
        },
        query<T>(schema: ZodType<T>) {
          return schema.parse(Object.fromEntries(url.searchParams.entries()));
        },
      };

      const result = await handler(ctx);
      const res = result instanceof Response ? result : json(result ?? { ok: true });
      res.headers.set("Cache-Control", "no-store");
      cookieHeaders?.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") res.headers.append("set-cookie", value);
      });
      return res;
    } catch (err) {
      return errorResponse(err, req, user);
    }
  };
}
