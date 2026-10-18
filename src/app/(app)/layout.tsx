import Link from "next/link";
import { requireOnboardedUser } from "@/server/page-auth";
import { MobileNav, SessionKeepAlive, Sidebar } from "@/components/layout/nav";
import { t } from "@/i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  return (
    <div className="flex min-h-dvh">
      <Sidebar name={user.name} email={user.email} isAdmin={user.role === "ADMIN"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav isAdmin={user.role === "ADMIN"} />
        <main id="inhalt" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-10">
          {children}
        </main>
        <footer className="mx-auto mb-24 w-full max-w-6xl px-4 text-xs text-fg-muted sm:px-6 lg:mb-6 lg:px-8">
          <p>
            {t.estimate.disclaimerShort}{" "}
            <Link href="/hinweise" className="underline underline-offset-2 hover:text-fg">
              Mehr erfahren
            </Link>
            {" · "}
            <Link href="/datenschutz" className="underline underline-offset-2 hover:text-fg">
              {t.nav.privacy}
            </Link>
            {" · "}
            <Link href="/hilfe" className="underline underline-offset-2 hover:text-fg">
              {t.nav.help}
            </Link>
          </p>
        </footer>
      </div>
      <SessionKeepAlive />
    </div>
  );
}
