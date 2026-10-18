import Link from "next/link";
import { getPageUser } from "@/server/page-auth";
import { Logo } from "@/components/layout/logo";
import { t } from "@/i18n";

export default async function InfoLayout({ children }: { children: React.ReactNode }) {
  const user = await getPageUser();
  return (
    <div className="min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <Link href={user ? "/dashboard" : "/anmelden"} className="flex items-center gap-2">
            <Logo className="size-8" />
            <span className="font-semibold">{t.app.name}</span>
          </Link>
          <Link href={user ? "/dashboard" : "/anmelden"} className="text-sm text-primary hover:underline">
            {user ? "Zur App" : "Zur Anmeldung"}
          </Link>
        </header>
        <main id="inhalt" className="card p-6 sm:p-8 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-fg-muted [&_li]:text-fg-muted [&_li]:mb-1 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1">
          {children}
        </main>
        <nav className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-fg-muted" aria-label="Rechtliches">
          <Link href="/hinweise">{t.nav.model}</Link>
          <Link href="/datenschutz">{t.nav.privacy}</Link>
          <Link href="/impressum">{t.nav.imprint}</Link>
          <Link href="/hilfe">{t.nav.help}</Link>
        </nav>
      </div>
    </div>
  );
}
