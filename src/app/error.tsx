"use client";

import { Button, LinkButton } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="inhalt" className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Da ist etwas schiefgelaufen</h1>
      <p className="max-w-md text-sm text-fg-muted">
        Die Seite konnte nicht geladen werden. Bitte versuche es erneut.{error.digest ? ` (Referenz: ${error.digest})` : ""}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Erneut versuchen</Button>
        <LinkButton href="/dashboard" variant="outline">
          Zur Übersicht
        </LinkButton>
      </div>
    </main>
  );
}
