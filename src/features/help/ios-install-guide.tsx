import type { ReactNode } from "react";
import { env } from "@/server/env";

/*
 * Schritt-für-Schritt-Anleitung: Pegel auf dem iPhone über Safari als App installieren.
 * Die Abbildungen sind eigene, vereinfachte Zeichnungen (keine Original-Screenshots von iOS)
 * und passen sich dem gewählten Farbschema an.
 */

/** Adresse der Installation, wie sie in der Safari-Adressleiste erscheint */
const HOST = new URL(env.appUrl).host;

const W = 150;
const H = 300;

function Phone({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-36 shrink-0 sm:w-40">
      <rect x="2" y="2" width={W - 4} height={H - 4} rx="24" fill="var(--card)" stroke="var(--fg-muted)" strokeWidth="3" />
      <rect x="55" y="10" width="40" height="10" rx="5" fill="var(--fg-muted)" opacity=".5" />
      {children}
    </svg>
  );
}

/** Pulsierender Kreis: "hier tippen" */
function Tap({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="13" fill="none" stroke="var(--primary)" strokeWidth="3" />
      <circle cx={x} cy={y} r="19" fill="none" stroke="var(--primary)" strokeWidth="1.5" opacity=".5">
        <animate attributeName="r" values="14;22;14" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values=".6;0;.6" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

/** Hervorgehobener Bereich (für Schaltflächen mit Text, damit nichts verdeckt wird) */
function TapBox({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <rect x={x} y={y} width={w} height={h} rx="7" fill="color-mix(in oklab, var(--primary) 18%, transparent)" stroke="var(--primary)" strokeWidth="2">
      <animate attributeName="stroke-opacity" values="1;.35;1" dur="1.8s" repeatCount="indefinite" />
    </rect>
  );
}

function ShareIcon({ x, y, color = "var(--fg)" }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x - 7} ${y - 9})`} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7H2.5v11h11V7H12" />
      <path d="M8 1v11M5 4l3-3 3 3" />
    </g>
  );
}

function PlusSquare({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 7} ${y - 7})`} fill="none" stroke="var(--fg)" strokeWidth="1.6" strokeLinecap="round">
      <rect x="0.5" y="0.5" width="13" height="13" rx="3" />
      <path d="M7 4v6M4 7h6" />
    </g>
  );
}

function AppIcon({ x, y, size = 26 }: { x: number; y: number; size?: number }) {
  const s = size / 512;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect width="512" height="512" rx="112" fill="#11161c" />
      <clipPath id="guide-glass">
        <path d="M150 112h212l-26 282a28 28 0 0 1-28 25H204a28 28 0 0 1-28-25z" />
      </clipPath>
      <g clipPath="url(#guide-glass)">
        <path d="M120 262c34-18 68-18 102 0s68 18 102 0 68-18 102 0V440H120z" fill="#22d3ee" />
      </g>
      <path d="M150 112h212l-26 282a28 28 0 0 1-28 25H204a28 28 0 0 1-28-25z" fill="none" stroke="#e6edf3" strokeWidth="22" strokeLinejoin="round" />
    </g>
  );
}

/** Angedeuteter Seiteninhalt (Pegel-Übersicht) */
function PageSkeleton({ top = 64 }: { top?: number }) {
  return (
    <g opacity=".8">
      <rect x="16" y={top} width="80" height="9" rx="3" fill="var(--fg)" opacity=".7" />
      <rect x="16" y={top + 18} width="54" height="34" rx="6" fill="var(--muted)" />
      <rect x="78" y={top + 18} width="54" height="34" rx="6" fill="var(--muted)" />
      <rect x="16" y={top + 60} width="116" height="62" rx="6" fill="var(--muted)" />
      <path d={`M24 ${top + 110} l14 -22 l12 10 l16 -28 l14 18 l12 -6 l16 16`} fill="none" stroke="var(--primary)" strokeWidth="2" />
    </g>
  );
}

function SafariBottomBar({ highlight }: { highlight?: "share" | "more" }) {
  const y = 262;
  return (
    <g>
      <rect x="10" y="232" width="130" height="22" rx="11" fill="var(--muted)" />
      <text x="75" y="247" textAnchor="middle" fontSize="8.5" fill="var(--fg)">
        {HOST}
      </text>
      <g stroke="var(--fg-muted)" strokeWidth="1.8" fill="none" strokeLinecap="round">
        <path d={`M22 ${y + 8} l-5 -5 l5 -5`} />
        <path d={`M44 ${y + 8} l5 -5 l-5 -5`} />
      </g>
      <ShareIcon x={75} y={y + 4} color={highlight === "share" ? "var(--primary)" : "var(--fg)"} />
      <g fill={highlight === "more" ? "var(--primary)" : "var(--fg)"}>
        <circle cx="122" cy={y + 3} r="1.8" />
        <circle cx="128" cy={y + 3} r="1.8" />
        <circle cx="116" cy={y + 3} r="1.8" />
      </g>
      <rect x="95" y={y - 4} width="10" height="13" rx="2" fill="none" stroke="var(--fg-muted)" strokeWidth="1.5" />
    </g>
  );
}


const STEPS: { title: string; text: ReactNode; image: ReactNode }[] = [
  {
    title: "Seite in Safari öffnen",
    text: (
      <>
        Öffne <strong>Safari</strong> und rufe die Adresse auf, unter der du Pegel nutzt. Melde dich am besten gleich an.
      </>
    ),
    image: (
      <Phone label="Safari mit geöffneter Pegel-Seite">
        <PageSkeleton />
        <SafariBottomBar />
      </Phone>
    ),
  },
  {
    title: "Auf „Teilen“ tippen",
    text: (
      <>
        Tippe in der Leiste unten auf das <strong>Teilen-Symbol</strong> (Quadrat mit Pfeil nach oben). Siehst du es nicht, tippe zuerst auf{" "}
        <strong>„•••“</strong> und dann auf <strong>„Teilen“</strong>. Auf dem iPad sitzt das Symbol oben rechts.
      </>
    ),
    image: (
      <Phone label="Teilen-Symbol in der unteren Safari-Leiste hervorgehoben">
        <PageSkeleton />
        <SafariBottomBar highlight="share" />
        <Tap x={75} y={266} />
      </Phone>
    ),
  },
  {
    title: "„Zum Home-Bildschirm“ wählen",
    text: (
      <>
        Scrolle im Menü nach unten und tippe auf <strong>„Zum Home-Bildschirm“</strong>. Fehlt der Eintrag, ganz unten über{" "}
        <strong>„Aktionen bearbeiten“</strong> hinzufügen.
      </>
    ),
    image: (
      <Phone label="Teilen-Menü mit dem Eintrag Zum Home-Bildschirm">
        <rect x="8" y="70" width="134" height="190" rx="14" fill="var(--muted)" />
        <AppIcon x={18} y={80} size={22} />
        <text x="46" y="91" fontSize="8.5" fontWeight="600" fill="var(--fg)">
          Pegel
        </text>
        <rect x="46" y="95" width="60" height="5" rx="2.5" fill="var(--fg-muted)" opacity=".5" />
        {["Kopieren", "Zur Leseliste", "Lesezeichen", "Zum Home-Bildschirm", "Merkzettel"].map((label, i) => {
          const y = 116 + i * 26;
          const active = i === 3;
          return (
            <g key={label}>
              <rect x="14" y={y} width="122" height="22" rx="7" fill={active ? "color-mix(in oklab, var(--primary) 22%, var(--card))" : "var(--card)"} stroke={active ? "var(--primary)" : "none"} strokeWidth="1.5" />
              <text x="20" y={y + 14.5} fontSize="7.5" fill="var(--fg)" fontWeight={active ? 600 : 400}>
                {label}
              </text>
              {active ? <PlusSquare x={124} y={y + 11} /> : <rect x="118" y={y + 5} width="12" height="12" rx="3" fill="none" stroke="var(--fg-muted)" strokeWidth="1.3" />}
            </g>
          );
        })}
        <Tap x={124} y={207} />
      </Phone>
    ),
  },
  {
    title: "„Hinzufügen“ tippen",
    text: (
      <>
        Der Name <strong>„Pegel“</strong> ist schon eingetragen. Lass <strong>„Als Web-App öffnen“</strong> eingeschaltet (falls angezeigt) und tippe
        oben rechts auf <strong>„Hinzufügen“</strong>.
      </>
    ),
    image: (
      <Phone label="Dialog Zum Home-Bildschirm mit Schaltfläche Hinzufügen">
        <text x="18" y="44" fontSize="8.5" fill="var(--primary)">
          Abbrechen
        </text>
        <text x="132" y="44" fontSize="8.5" fontWeight="700" fill="var(--primary)" textAnchor="end">
          Hinzufügen
        </text>
        <TapBox x={84} y={32} w={54} h={16} />
        <rect x="12" y="58" width="126" height="54" rx="10" fill="var(--muted)" />
        <AppIcon x={20} y={66} size={36} />
        <text x="64" y="80" fontSize="10" fontWeight="600" fill="var(--fg)">
          Pegel
        </text>
        <rect x="64" y="88" width="62" height="5" rx="2.5" fill="var(--fg-muted)" opacity=".5" />
        <rect x="12" y="122" width="126" height="26" rx="10" fill="var(--muted)" />
        <text x="20" y="139" fontSize="8" fill="var(--fg)">
          Als Web-App öffnen
        </text>
        <rect x="108" y="128" width="24" height="14" rx="7" fill="var(--success)" />
        <circle cx="125" cy="135" r="5.5" fill="#fff" />
        <g opacity=".5">
          {[0, 1, 2].map((r) => (
            <g key={r}>
              {Array.from({ length: 9 }).map((_, c) => (
                <rect key={c} x={14 + c * 14} y={176 + r * 20} width="11" height="15" rx="3" fill="var(--muted)" />
              ))}
            </g>
          ))}
        </g>
      </Phone>
    ),
  },
  {
    title: "Pegel vom Home-Bildschirm starten",
    text: (
      <>
        Auf dem Home-Bildschirm liegt jetzt das <strong>Pegel-Symbol</strong>. Ab sofort startet Pegel von dort im Vollbild – ohne Adressleiste, wie
        eine echte App.
      </>
    ),
    image: (
      <Phone label="Home-Bildschirm mit dem Pegel-Symbol">
        {Array.from({ length: 16 }).map((_, i) => {
          const x = 16 + (i % 4) * 31;
          const y = 40 + Math.floor(i / 4) * 40;
          return i === 9 ? (
            <g key={i}>
              <AppIcon x={x} y={y} size={24} />
              <text x={x + 12} y={y + 33} fontSize="6.5" textAnchor="middle" fill="var(--fg)">
                Pegel
              </text>
            </g>
          ) : (
            <rect key={i} x={x} y={y} width="24" height="24" rx="6" fill="var(--muted)" />
          );
        })}
        <Tap x={59} y={132} />
        <rect x="14" y="250" width="122" height="34" rx="12" fill="var(--muted)" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={22 + i * 29} y="255" width="24" height="24" rx="6" fill="var(--card)" />
        ))}
      </Phone>
    ),
  },
  {
    title: "Optional: Erinnerungen erlauben",
    text: (
      <>
        In der installierten App unter <strong>Einstellungen → Benachrichtigungen</strong> auf <strong>„Aktivieren“</strong> tippen und im
        iPhone-Dialog <strong>„Erlauben“</strong> wählen. Push funktioniert auf dem iPhone nur in der installierten App (ab iOS 16.4).
      </>
    ),
    image: (
      <Phone label="Dialog zum Erlauben von Mitteilungen">
        <PageSkeleton top={50} />
        <rect x="0" y="0" width={W} height={H} rx="24" fill="#000" opacity=".35" />
        <rect x="18" y="104" width="114" height="92" rx="14" fill="var(--card)" />
        <text x="75" y="126" fontSize="8" fontWeight="700" textAnchor="middle" fill="var(--fg)">
          „Pegel“ möchte dir
        </text>
        <text x="75" y="137" fontSize="8" fontWeight="700" textAnchor="middle" fill="var(--fg)">
          Mitteilungen senden
        </text>
        <line x1="18" y1="152" x2="132" y2="152" stroke="var(--border)" />
        <line x1="75" y1="152" x2="75" y2="196" stroke="var(--border)" />
        <text x="46" y="177" fontSize="8.5" textAnchor="middle" fill="var(--primary)">
          Nicht erlauben
        </text>
        <text x="104" y="177" fontSize="8.5" fontWeight="700" textAnchor="middle" fill="var(--primary)">
          Erlauben
        </text>
        <TapBox x={79} y={160} w={49} h={28} />
      </Phone>
    ),
  },
];

export function IosInstallGuide({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <ol className={compact ? "grid gap-4" : "grid gap-5 sm:grid-cols-2"}>
        {STEPS.map((s, i) => (
          <li key={s.title} className="!ml-0 !mb-0 flex !list-none items-start gap-4 rounded-[var(--radius)] border border-border bg-card/70 p-3">
            {s.image}
            <div className="min-w-0">
              <p className="!mb-1 flex items-center gap-2 !text-fg">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-fg">{i + 1}</span>
                <span className="font-medium">{s.title}</span>
              </p>
              <p className="!mb-0 text-sm text-fg-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="!mb-0 text-xs text-fg-muted">
        Tipp: Das klappt auch mit Chrome oder Edge auf dem iPhone über das Teilen-Menü. Wichtig ist, Pegel danach immer über das Symbol auf dem
        Home-Bildschirm zu öffnen – die Anmeldung bleibt dort erhalten. Abbildungen vereinfacht; je nach iOS-Version sieht Safari leicht anders aus.
      </p>
    </div>
  );
}
