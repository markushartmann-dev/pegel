import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { t } from "@/i18n";

/** Breites Layout für die Registrierung: Einleitung links, Formular rechts (mobil untereinander). */
export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden px-4 py-8 sm:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(60rem 30rem at 10% -10%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%), radial-gradient(40rem 30rem at 110% 110%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 60%)",
        }}
      />
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center gap-3">
          <Logo className="size-10" />
          <div>
            <p className="text-xl font-semibold tracking-tight">{t.app.name}</p>
            <p className="text-sm text-fg-muted">{t.app.tagline}</p>
          </div>
        </header>
        <main id="inhalt">{children}</main>
        <p className="mt-10 text-center text-xs text-fg-muted">
          <Link href="/datenschutz" className="hover:text-fg">
            {t.nav.privacy}
          </Link>
          {" · "}
          <Link href="/hinweise" className="hover:text-fg">
            {t.nav.model}
          </Link>
          {" · "}
          <Link href="/impressum" className="hover:text-fg">
            {t.nav.imprint}
          </Link>
        </p>
      </div>
    </div>
  );
}
