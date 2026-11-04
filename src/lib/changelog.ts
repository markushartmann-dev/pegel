/**
 * Liest die CHANGELOG.md (Format "Keep a Changelog") in eine einfache Struktur.
 * Unterstützt genau das, was die Datei verwendet: Versionen, Rubriken, Absätze und Listenpunkte.
 */
export interface ChangelogSection {
  title: string | null;
  items: string[];
  paragraphs: string[];
}

export interface ChangelogRelease {
  version: string;
  date: string | null;
  sections: ChangelogSection[];
}

const RELEASE = /^## \[([^\]]+)\](?:\s*[–-]\s*(\d{4}-\d{2}-\d{2}))?/;

export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let release: ChangelogRelease | null = null;
  let section: ChangelogSection | null = null;

  const current = (r: ChangelogRelease) => {
    if (!section) {
      section = { title: null, items: [], paragraphs: [] };
      r.sections.push(section);
    }
    return section;
  };

  for (const raw of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    const match = RELEASE.exec(line);
    if (match) {
      release = { version: match[1], date: match[2] ?? null, sections: [] };
      section = null;
      // "Unveröffentlicht" ohne Inhalt wird unten aussortiert
      releases.push(release);
      continue;
    }
    // Linkverweise am Dateiende, z. B. "[1.3.0]: https://…"
    if (!release || !line || /^\[[^\]]+\]:/.test(line)) continue;
    if (line.startsWith("### ")) {
      section = { title: line.slice(4).trim(), items: [], paragraphs: [] };
      release.sections.push(section);
    } else if (line.startsWith("- ")) {
      current(release).items.push(line.slice(2).trim());
    } else {
      current(release).paragraphs.push(line);
    }
  }
  return releases.filter((r) => r.date !== null && r.sections.length > 0);
}

export type InlinePart = { type: "text" | "bold" | "code"; value: string };

/** Zerlegt **fett** und `code` in Teile, damit sie ohne HTML-Einbettung gerendert werden können. */
export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0;
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push(m[1] !== undefined ? { type: "bold", value: m[1] } : { type: "code", value: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}
