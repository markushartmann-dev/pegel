"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CupSoda,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  Shield,
  Users,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { t } from "@/i18n";
import { Logo } from "./logo";

const MAIN = [
  { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
  { href: "/erfassen", label: t.nav.log, icon: PlusCircle },
  { href: "/kalender", label: t.nav.calendar, icon: CalendarDays },
  { href: "/statistik", label: t.nav.statistics, icon: BarChart3 },
  { href: "/verlauf", label: t.nav.history, icon: History },
  { href: "/getraenke", label: t.nav.beverages, icon: CupSoda },
  { href: "/community", label: t.nav.community, icon: Users },
  { href: "/einstellungen", label: t.nav.settings, icon: Settings },
];

// Reihenfolge der unteren Leiste; mit „Mehr“ als 5. Eintrag steht „Erfassen“ genau in der Mitte.
const MOBILE_PRIMARY = ["/dashboard", "/kalender", "/erfassen", "/statistik"];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut().catch(() => undefined);
        router.replace("/anmelden");
        router.refresh();
      }}
      className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-muted hover:text-fg", className)}
    >
      <LogOut className="size-4" aria-hidden />
      {busy ? "Wird abgemeldet …" : t.nav.logout}
    </button>
  );
}

export function Sidebar({ name, email, isAdmin }: { name: string; email: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...MAIN, { href: "/admin", label: t.nav.admin, icon: Shield }] : MAIN;
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card/60 px-3 py-5 backdrop-blur lg:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-3">
        <Logo className="size-8" />
        <span className="text-lg font-semibold tracking-tight">{t.app.name}</span>
      </Link>
      <nav aria-label={t.nav.mainNavigation} className="flex-1">
        <ul className="flex flex-col gap-0.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] font-medium text-primary" : "text-fg-muted hover:bg-muted hover:text-fg",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-4 border-t border-border pt-4">
        <Link href="/hinweise" className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-muted hover:text-fg">
          <Info className="size-4" aria-hidden />
          {t.nav.model}
        </Link>
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-fg-muted">{email}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = MOBILE_PRIMARY.map((href) => MAIN.find((i) => i.href === href)!);
  const more = [...MAIN.filter((i) => !MOBILE_PRIMARY.includes(i.href)), ...(isAdmin ? [{ href: "/admin", label: t.nav.admin, icon: Shield }] : []), { href: "/hinweise", label: t.nav.model, icon: Info }];
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/85 px-4 backdrop-blur lg:hidden pt-[env(safe-area-inset-top)] box-content">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo className="size-7" />
          <span className="font-semibold">{t.app.name}</span>
        </Link>
      </header>
      <nav
        aria-label={t.nav.mainNavigation}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur lg:hidden pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5">
          {primary.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const isLog = href === "/erfassen";
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-primary" : "text-fg-muted")}
                >
                  {isLog ? (
                    <span className="-mt-5 flex size-11 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lg">
                      <Icon className="size-5" aria-hidden />
                    </span>
                  ) : (
                    <Icon className="size-5" aria-hidden />
                  )}
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="mobile-more"
              className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] text-fg-muted"
            >
              <Menu className="size-5" aria-hidden />
              {t.nav.more}
            </button>
          </li>
        </ul>
      </nav>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t.nav.more} id="mobile-more">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label={t.common.close} onClick={() => setOpen(false)} />
          <div className="card absolute inset-x-2 bottom-2 rounded-2xl p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-sm font-medium">{t.nav.more}</span>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-fg-muted hover:bg-muted" aria-label={t.common.close}>
                <X className="size-4" />
              </button>
            </div>
            <ul className="grid grid-cols-1 gap-0.5">
              {more.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(pathname, href) ? "page" : undefined}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-muted aria-[current=page]:text-primary"
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <LogoutButton className="py-3" />
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Verlängert die Sitzung im Hintergrund (gleitende Gültigkeit), ohne als Benutzeraktivität zu zählen.
 */
export function SessionKeepAlive() {
  useEffect(() => {
    void fetch("/api/auth/get-session", { credentials: "same-origin", cache: "no-store" }).catch(() => undefined);
  }, []);
  return null;
}
