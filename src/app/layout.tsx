import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/inter";
import "./globals.css";
import { getPageUser } from "@/server/page-auth";
import { ToastProvider } from "@/components/ui/client";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { t } from "@/i18n";

export const metadata: Metadata = {
  title: { default: t.app.name, template: `%s · ${t.app.name}` },
  description: t.app.description,
  applicationName: t.app.name,
  appleWebApp: { capable: true, title: t.app.name, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1014" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce aus dem Proxy: Next.js versieht damit automatisch seine Skripte.
  await headers();
  const user = await getPageUser();
  const scheme = (user?.colorScheme ?? "MIDNIGHT").toLowerCase();
  const mode = (user?.themeMode ?? "SYSTEM").toLowerCase();
  return (
    <html lang="de" data-scheme={scheme} data-mode={mode} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-fg"
        >
          Zum Inhalt springen
        </a>
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
