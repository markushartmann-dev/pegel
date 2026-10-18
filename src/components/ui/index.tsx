import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, Info, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:brightness-110 shadow-sm",
  secondary: "bg-muted text-fg hover:bg-[color-mix(in_oklab,var(--muted)_80%,var(--fg)_8%)]",
  ghost: "text-fg hover:bg-muted",
  danger: "bg-danger text-white hover:brightness-110",
  outline: "border border-border bg-card text-fg hover:bg-muted",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
  icon: "h-10 w-10 justify-center",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium transition-[filter,background-color] select-none",
    "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  loading,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      type="button"
      className={buttonClass(variant, size, className)}
      aria-busy={loading || undefined}
      {...props}
      disabled={props.disabled || loading}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("card p-4 sm:p-5", className)} {...props} />;
}

export function CardHeader({ title, description, action, icon }: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        {icon && <span className="mt-0.5 text-primary">{icon}</span>}
        <div>
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const inputBase =
  "w-full rounded-[var(--radius-sm)] border border-border bg-card px-3 text-fg placeholder:text-fg-muted/70 " +
  "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-0 disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputBase, "h-10", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputBase, "h-10 pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputBase, "min-h-20 py-2", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Badge({ className, tone = "neutral", ...props }: ComponentProps<"span"> & { tone?: "neutral" | "primary" | "danger" | "warning" | "success" }) {
  const tones = {
    neutral: "bg-muted text-fg-muted",
    primary: "bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-primary",
    danger: "bg-[color-mix(in_oklab,var(--danger)_15%,transparent)] text-danger",
    warning: "bg-[color-mix(in_oklab,var(--warning)_15%,transparent)] text-warning",
    success: "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-success",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />;
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const map = {
    info: { icon: Info, cls: "border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_7%,var(--card))]", ic: "text-primary" },
    warning: { icon: AlertTriangle, cls: "border-[color-mix(in_oklab,var(--warning)_40%,var(--border))] bg-[color-mix(in_oklab,var(--warning)_8%,var(--card))]", ic: "text-warning" },
    danger: { icon: XCircle, cls: "border-[color-mix(in_oklab,var(--danger)_40%,var(--border))] bg-[color-mix(in_oklab,var(--danger)_8%,var(--card))]", ic: "text-danger" },
    success: { icon: CheckCircle2, cls: "border-[color-mix(in_oklab,var(--success)_40%,var(--border))] bg-[color-mix(in_oklab,var(--success)_8%,var(--card))]", ic: "text-success" },
  }[tone];
  const Icon = map.icon;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-[var(--radius-sm)] border p-3 text-sm", map.cls, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", map.ic)} aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "text-fg-muted")}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-border px-6 py-10 text-center">
      {icon && <div className="mb-1 rounded-full bg-muted p-3 text-fg-muted">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm text-fg-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Wird geladen …" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-fg-muted" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius-sm)] bg-muted", className)} aria-hidden />;
}

/** Segmentierte Auswahl als Links (funktioniert ohne JavaScript). */
export function SegmentedLinks({ items, active, label }: { items: { href: string; label: string; value: string }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
      <ul className="inline-flex min-w-max gap-1 rounded-[var(--radius-sm)] border border-border bg-card p-1">
        {items.map((it) => (
          <li key={it.value}>
            <Link
              href={it.href}
              aria-current={it.value === active ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center rounded-md px-3 text-sm whitespace-nowrap transition-colors",
                it.value === active ? "bg-primary text-primary-fg" : "text-fg-muted hover:bg-muted hover:text-fg",
              )}
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Seitennavigation" className="mt-4 flex items-center justify-between gap-2 text-sm">
      {page > 1 ? (
        <LinkButton href={hrefFor(page - 1)} variant="outline" size="sm">
          ← Vorherige
        </LinkButton>
      ) : (
        <span />
      )}
      <span className="text-fg-muted tabular">
        Seite {page} von {pages}
      </span>
      {page < pages ? (
        <LinkButton href={hrefFor(page + 1)} variant="outline" size="sm">
          Nächste →
        </LinkButton>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function Stat({ label, value, sub, icon, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: "primary" }) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <div className="flex items-center justify-between text-sm text-fg-muted">
        <span>{label}</span>
        {icon && <span className={tone === "primary" ? "text-primary" : "text-fg-muted"}>{icon}</span>}
      </div>
      <div className="text-2xl font-semibold tracking-tight tabular">{value}</div>
      {sub && <div className="text-xs text-fg-muted">{sub}</div>}
    </div>
  );
}
