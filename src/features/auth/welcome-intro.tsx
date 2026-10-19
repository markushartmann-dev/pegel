import { BarChart3, ExternalLink, Lock, PiggyBank, Smartphone, Timer, Users } from "lucide-react";
import { IosInstallGuide } from "@/features/help/ios-install-guide";

export const PROJECT_URL = "https://github.com/markushartmann-dev/pegel";

const FEATURES = [
  { icon: BarChart3, title: "Überblick statt Bauchgefühl", text: "Getränk antippen, fertig. Du siehst Gramm reinen Alkohol pro Tag, Woche und Monat – und wie sich das entwickelt." },
  { icon: PiggyBank, title: "Sparschwein für Pausen", text: "Jeder Tag ohne Alkohol bringt 5 €, eine volle Woche am Stück 10 € extra, ein ganzer Monat 20 € extra." },
  { icon: Users, title: "Gemeinsam statt allein", text: "Freundliches Ranking in unserer Runde – mit Namen oder Pseudonym, jederzeit abwählbar." },
  { icon: Timer, title: "Transparente Schätzung", text: "Ein Modell schätzt, wann rechnerisch wieder 0,0 ‰ erreicht sind. Keine Messung und nie eine Entscheidungshilfe fürs Fahren." },
  { icon: Lock, title: "Deine Daten bleiben privat", text: "Einzelne Einträge sieht niemand außer dir. Selbst gehostet, ohne Tracker, Export und Löschen jederzeit." },
  {
    icon: Smartphone,
    title: "Alles drin",
    text: "Erfassen in Sekunden, Kalender mit Tagesdetails, Statistiken, eigene Getränke, fünf Farbschemata, Hell/Dunkel, installierbar als App mit optionalen Erinnerungen.",
  },
];

const SHOTS = [
  { src: "/intro/uebersicht.webp", alt: "Übersicht mit Tageswerten, Modellschätzung und Sparschwein", caption: "Übersicht" },
  { src: "/intro/sparschwein.webp", alt: "Sparschwein-Ranking der Community", caption: "Sparschwein & Community" },
  { src: "/intro/statistik.webp", alt: "Statistik mit Tagesverlauf im Farbschema Sunset", caption: "Statistik" },
];

/** Einleitung auf der Registrierungsseite: worum es geht und was es bringt. */
export function WelcomeIntro() {
  return (
    <section aria-labelledby="intro-title" className="flex flex-col gap-6">
      <div>
        <h1 id="intro-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Bewusster trinken – mit einem Blick.
        </h1>
        <p className="mt-3 max-w-xl text-fg-muted">
          Pegel ist ein privates Alkohol-Tagebuch für unsere Runde. Es geht nicht ums Verbieten, sondern ums Hinschauen: Wer seinen Konsum sieht,
          trifft leichter bewusste Entscheidungen – und die alkoholfreien Tage zahlen sich im Sparschwein sichtbar aus.
        </p>
        <a href="#konto" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline lg:hidden">
          Direkt zum Konto ↓
        </a>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3 rounded-[var(--radius)] border border-border bg-card/70 p-3 backdrop-blur">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_15%,transparent)] text-primary">
              <Icon className="size-4" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-medium">{title}</span>
              <span className="block text-sm text-fg-muted">{text}</span>
            </span>
          </li>
        ))}
      </ul>

      <details className="group rounded-[var(--radius)] border border-border bg-card/70 p-4 backdrop-blur">
        <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
          <span className="text-primary group-open:hidden">▸ Details & Screenshots ansehen</span>
          <span className="hidden text-primary group-open:inline">▾ Details & Screenshots</span>
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-3">
              {SHOTS.map((s) => (
                <figure key={s.src}>
                  <a href={s.src} target="_blank" rel="noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.src} alt={s.alt} loading="lazy" className="w-full rounded-[var(--radius-sm)] border border-border" />
                  </a>
                  <figcaption className="mt-1 text-xs text-fg-muted">{s.caption}</figcaption>
                </figure>
              ))}
            </div>
            <figure className="hidden sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/intro/mobil-erfassen.webp"
                alt="Getränk erfassen auf dem Smartphone"
                loading="lazy"
                className="w-40 rounded-[var(--radius-sm)] border border-border"
              />
              <figcaption className="mt-1 text-xs text-fg-muted">Als App auf dem Handy</figcaption>
            </figure>
          </div>
          <p className="text-xs text-fg-muted">Die Screenshots zeigen Demo-Daten.</p>
          <a
            href={PROJECT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <ExternalLink className="size-4" aria-hidden />
            Alle Details und Quellcode auf GitHub
          </a>
        </div>
      </details>
      <details className="group rounded-[var(--radius)] border border-border bg-card/70 p-4 backdrop-blur">
        <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
          <span className="text-primary group-open:hidden">▸ Als App aufs iPhone – Schritt für Schritt</span>
          <span className="hidden text-primary group-open:inline">▾ Als App aufs iPhone – Schritt für Schritt</span>
        </summary>
        <div className="mt-4">
          <IosInstallGuide compact />
        </div>
      </details>
    </section>
  );
}
