import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (früher "Middleware"):
 *  1. Content Security Policy mit Nonce für jede Seitenanfrage.
 *  2. Optimistische Weiterleitung zur Anmeldung, wenn kein Sitzungscookie vorhanden ist.
 *     Die eigentliche Prüfung erfolgt immer serverseitig gegen die Datenbank.
 *  3. HSTS, wenn die App über HTTPS ausgeliefert wird.
 */
const PUBLIC_PATHS = [
  "/anmelden",
  "/registrieren",
  "/passwort-vergessen",
  "/passwort-zuruecksetzen",
  "/datenschutz",
  "/hinweise",
  "/impressum",
  "/hilfe",
  "/offline",
];

function hasSessionCookie(req: NextRequest) {
  return req.cookies.has("pegel.session_token") || req.cookies.has("__Secure-pegel.session_token");
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = pathname === "/" || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isPublic && !hasSessionCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/anmelden";
    url.search = pathname !== "/dashboard" ? `?weiter=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const https = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Recharts und Next.js setzen Inline-Styles
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  if (https) res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icons|intro|sw.js|manifest.webmanifest|offline.html).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
