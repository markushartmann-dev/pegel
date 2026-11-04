import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { parseChangelog } from "@/lib/changelog";

/** CHANGELOG.md liegt im Projektordner; ins Standalone-Image kommt sie über outputFileTracingIncludes. */
export const getChangelog = cache(() => {
  try {
    return parseChangelog(readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf8"));
  } catch {
    return [];
  }
});

export const getAppVersion = () => getChangelog()[0]?.version ?? null;
