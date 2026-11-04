import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseChangelog, parseInline } from "@/lib/changelog";

const SAMPLE = `# Changelog

Einleitung.

## [Unveröffentlicht]

## [1.1.0] – 2026-11-04

### Hinzugefügt
- **Neu:** etwas mit \`CODE\`.

### Behoben (vor der Veröffentlichung)
- Fehler weg.

## [1.0.0] – 2026-10-18

Erste Version.

[Unveröffentlicht]: https://example.org/compare
[1.1.0]: https://example.org/compare
`;

describe("parseChangelog", () => {
  it("liest Versionen, Rubriken und Absätze und überspringt Leeres", () => {
    const r = parseChangelog(SAMPLE);
    expect(r.map((x) => x.version)).toEqual(["1.1.0", "1.0.0"]);
    expect(r[0].date).toBe("2026-11-04");
    expect(r[0].sections.map((s) => s.title)).toEqual(["Hinzugefügt", "Behoben (vor der Veröffentlichung)"]);
    expect(r[0].sections[0].items).toEqual(["**Neu:** etwas mit `CODE`."]);
    expect(r[1].sections[0]).toMatchObject({ title: null, paragraphs: ["Erste Version."] });
  });

  it("verträgt Windows-Zeilenenden und übernimmt keine Linkverweise", () => {
    const r = parseChangelog(SAMPLE.replace(/\n/g, "\r\n"));
    expect(r).toHaveLength(2);
    expect(JSON.stringify(r)).not.toContain("example.org");
  });

  it("die echte CHANGELOG.md ist lesbar und beginnt mit der Version aus package.json", () => {
    const releases = parseChangelog(readFileSync("CHANGELOG.md", "utf8"));
    const { version } = JSON.parse(readFileSync("package.json", "utf8"));
    expect(releases[0].version).toBe(version);
    expect(releases.every((r) => r.sections.length > 0)).toBe(true);
  });
});

describe("parseInline", () => {
  it("trennt Text, Fett und Code", () => {
    expect(parseInline("a **b** c `d`")).toEqual([
      { type: "text", value: "a " },
      { type: "bold", value: "b" },
      { type: "text", value: " c " },
      { type: "code", value: "d" },
    ]);
  });
  it("lässt HTML als reinen Text", () => {
    expect(parseInline("<script>x</script>")).toEqual([{ type: "text", value: "<script>x</script>" }]);
  });
});
