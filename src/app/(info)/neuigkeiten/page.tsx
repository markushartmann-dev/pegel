import type { Metadata } from "next";
import { Badge } from "@/components/ui";
import { formatDayKey } from "@/lib/dates";
import { parseInline } from "@/lib/changelog";
import { getChangelog } from "@/server/changelog";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.nav.news };

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) =>
        part.type === "bold" ? (
          <strong key={i} className="font-semibold text-fg">
            {part.value}
          </strong>
        ) : part.type === "code" ? (
          <code key={i}>{part.value}</code>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </>
  );
}

export default function NewsPage() {
  const releases = getChangelog();
  return (
    <article>
      <h1>{t.nav.news}</h1>
      <p>Was sich in Pegel geändert hat, neueste Version zuerst.</p>
      {releases.length === 0 && <p>Derzeit sind keine Versionshinweise verfügbar.</p>}
      {releases.map((release, index) => (
        <section key={release.version} aria-labelledby={`v-${release.version}`}>
          <h2 id={`v-${release.version}`} className="flex flex-wrap items-center gap-2">
            Version {release.version}
            {index === 0 && <Badge tone="primary">aktuell</Badge>}
            {release.date && <span className="text-sm font-normal text-fg-muted">{formatDayKey(release.date)}</span>}
          </h2>
          {release.sections.map((section, i) => (
            <div key={section.title ?? i}>
              {section.title && <h3 className="mt-4 mb-1 text-sm font-semibold">{section.title}</h3>}
              {section.paragraphs.map((text) => (
                <p key={text}>
                  <Inline text={text} />
                </p>
              ))}
              {section.items.length > 0 && (
                <ul>
                  {section.items.map((text) => (
                    <li key={text}>
                      <Inline text={text} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}
    </article>
  );
}
