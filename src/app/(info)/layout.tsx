import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPageUser } from "@/server/page-auth";
import { Logo } from "@/components/layout/logo";
import { t } from "@/i18n";

export default async function InfoLayout({ children }: { children: React.ReactNode }) {
  const user = await getPageUser();
  return (
    <div className="min-h-dvh">
      {/* Kopfzeile bleibt beim Scrollen stehen, damit der Weg zurück immer sichtbar ist. */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-bg/70">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href={user ? "/dashboard" : "/anmelden"} className="flex items-center gap-2">
            <Logo className="size-8" />
            <span className="font-semibold">{t.app.name}</span>
          </Link>
          <Link
            href={user ? "/dashboard" : "/anmelden"}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium text-primary hover:bg-muted"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {user ? "Zur App" : "Zur Anmeldung"}
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <main id="inhalt" className="card p-6 sm:p-8 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-fg-muted [&_li]:text-fg-muted [&_li]:mb-1 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1">
          {children}
        </main>
        <nav className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-fg-muted" aria-label="Rechtliches">
          <Link href="/hinweise">{t.nav.model}</Link>
          <Link href="/datenschutz">{t.nav.privacy}</Link>
          <Link href="/impressum">{t.nav.imprint}</Link>
          <Link href="/hilfe">{t.nav.help}</Link>
          <Link href="/neuigkeiten">{t.nav.news}</Link>
        </nav>
      </div>
    </div>
  );
}
