import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { t } from "@/i18n";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(60rem 30rem at 10% -10%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%), radial-gradient(40rem 30rem at 110% 110%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 60%)",
        }}
      />
      <main id="inhalt" className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-3 size-14" />
          <h1 className="text-2xl font-semibold tracking-tight">{t.app.name}</h1>
          <p className="mt-1 text-sm text-fg-muted">{t.app.tagline}</p>
        </div>
        <div className="card p-6">{children}</div>
        <p className="mt-6 text-center text-xs text-fg-muted">
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
      </main>
    </div>
  );
}
