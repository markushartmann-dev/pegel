import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="inhalt" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-semibold text-primary">404</p>
      <h1 className="text-xl font-semibold">Seite nicht gefunden</h1>
      <p className="max-w-sm text-sm text-fg-muted">Die Seite existiert nicht oder du hast keine Berechtigung, sie aufzurufen.</p>
      <LinkButton href="/">Zur Startseite</LinkButton>
    </main>
  );
}
