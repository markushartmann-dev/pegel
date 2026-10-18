// Legt in einer laufenden Test-/Demo-Instanz fünf fiktive Profile mit ca. 60 Tagen Verlauf an
// (für Screenshots und Vorführungen). NICHT gegen eine produktive Instanz ausführen.
//
//   DEMO_URL=http://localhost:3200 DATABASE_URL=postgresql://pegel:pegel@localhost:54332/pegel_e2e node scripts/demo-data.mjs
import pg from "pg";

const BASE = process.env.DEMO_URL ?? "http://localhost:3200";
const DB = process.env.DATABASE_URL;
if (!DB) throw new Error("DATABASE_URL fehlt");
export const DEMO_PASSWORD = "demo-passwort-2026";
const DAYS = 60;
const TZ = "Europe/Berlin";

// Deterministischer Zufall, damit Screenshots reproduzierbar bleiben
let seed = 20261018;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);

const PERSONAS = [
  {
    name: "Lena Hoffmann", email: "lena@pegel.demo", model: "WIDMARK_FEMALE", weight: 64, height: 169, scheme: "MIDNIGHT",
    community: { display: "DISPLAY_NAME" },
    own: [{ name: "Riesling trocken", volumeMl: 200, abv: 12.5, category: "WINE", description: "Weingut am Rhein" }],
    pattern: { weekday: 0.12, weekend: 0.55, drinks: ["Riesling trocken", "Sekt", "Wein 0,2 l", "Bier 0,33 l"], max: 3 },
    dryRecent: 9, // heute: [Getränk, Portionen, vor wie vielen Minuten]
    today: [["Sekt", 1, 110], ["Riesling trocken", 1, 50]],
  },
  {
    name: "Jonas Weber", email: "jonas@pegel.demo", model: "WIDMARK_MALE", weight: 86, height: 184, scheme: "OCEAN",
    community: { display: "PSEUDONYM", pseudonym: "Hopfenheld" },
    own: [{ name: "Helles vom Fass", volumeMl: 500, abv: 4.9, category: "BEER", description: "Stammkneipe" }],
    pattern: { weekday: 0.35, weekend: 0.8, drinks: ["Helles vom Fass", "Bier 0,5 l", "Weizen 0,5 l", "Schnaps 2 cl"], max: 4 },
  },
  {
    name: "Sophie Krause", email: "sophie@pegel.demo", model: "SEIDL_FEMALE", weight: 58, height: 172, scheme: "FOREST",
    community: { display: "DISPLAY_NAME" },
    own: [],
    pattern: { weekday: 0.03, weekend: 0.18, drinks: ["Radler 0,5 l", "Sekt", "Bier klein"], max: 2 },
    dryRecent: 31,
  },
  {
    name: "Max Becker", email: "max@pegel.demo", model: "SEIDL_MALE", weight: 92, height: 190, scheme: "SUNSET",
    community: { display: "PSEUDONYM", pseudonym: "Mäxchen" },
    own: [{ name: "Gin Tonic", volumeMl: 240, abv: 6.3, category: "MIXED", description: "4 cl Gin, Tonic" }],
    pattern: { weekday: 0.15, weekend: 0.7, drinks: ["Gin Tonic", "Bier 0,5 l", "Schnaps 2 cl", "Weizen 0,5 l"], max: 5 },
  },
  {
    name: "Aylin Demir", email: "aylin@pegel.demo", model: "CUSTOM", factor: 0.6, weight: 70, height: 165, scheme: "LIGHT",
    community: { display: "DISPLAY_NAME" },
    own: [{ name: "Cidre brut", volumeMl: 330, abv: 4.5, category: "CIDER", description: "Normandie" }],
    pattern: { weekday: 0.1, weekend: 0.4, drinks: ["Cidre brut", "Wein 0,2 l", "Sekt"], max: 2 },
  },
];

function cookieOf(res) {
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).filter((c) => !c.endsWith("=")).join("; ");
}

async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", origin: BASE, ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res;
}

function localDay(offset) {
  const d = new Date(Date.now() + offset * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

const client = new pg.Client({ connectionString: DB });
await client.connect();

for (const p of PERSONAS) {
  const signUp = await api("/api/auth/sign-up/email", { method: "POST", body: { name: p.name, email: p.email, password: DEMO_PASSWORD, timezone: TZ } });
  const cookie = cookieOf(signUp);
  await api("/api/v1/me/onboarding", {
    method: "POST",
    cookie,
    body: {
      profile: { distributionModel: p.model, customFactor: p.factor ?? null, weightKg: p.weight, heightCm: p.height, gender: "UNSPECIFIED" },
      timezone: TZ,
      themeMode: p.scheme === "LIGHT" ? "LIGHT" : "DARK",
      colorScheme: p.scheme,
      communityOptIn: true,
      acceptPrivacy: true,
      acceptHealthData: true,
    },
  });
  await api("/api/v1/me/community", { method: "PUT", cookie, body: { optIn: true, ...p.community } });
  for (const b of p.own) await api("/api/v1/beverages", { method: "POST", cookie, body: { ...b, isFavorite: true } });

  const { rows: [user] } = await client.query(`SELECT id FROM "user" WHERE email = $1`, [p.email]);
  // Registrierung und Profil zurückdatieren, damit Verlauf und Sparschwein Daten haben
  await client.query(`UPDATE "user" SET "createdAt" = now() - interval '${DAYS} days' WHERE id = $1`, [user.id]);
  await client.query(`UPDATE user_profile_revision SET "validFrom" = now() - interval '${DAYS} days' WHERE "userId" = $1`, [user.id]);
  const { rows: bevs } = await client.query(`SELECT id, name, category, "volumeMl", abv FROM beverage WHERE "ownerId" IS NULL OR "ownerId" = $1`, [user.id]);
  const byName = new Map(bevs.map((b) => [b.name, b]));

  const insert = async (bevName, servings, day, time) => {
    const b = byName.get(bevName);
    const grams = Math.round(b.volumeMl * (Number(b.abv) / 100) * 0.789 * servings * 100) / 100;
    await client.query(
      `INSERT INTO consumption_entry (id, "userId", "beverageId", "beverageName", category, abv, "volumeMl", servings, "alcoholGrams", "consumedAt", timezone, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, ($9::timestamp AT TIME ZONE $10), $10, now(), now())`,
      [user.id, b.id, b.name, b.category, b.abv, b.volumeMl, servings, grams, `${day} ${time}`, TZ],
    );
  };

  let count = 0;
  for (let off = -DAYS + 1; off <= -1; off++) {
    if (p.dryRecent && off >= -p.dryRecent) continue;
    const day = localDay(off);
    const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
    const weekend = dow === 5 || dow === 6;
    if (rnd() > (weekend ? p.pattern.weekend : p.pattern.weekday)) continue;
    const n = 1 + Math.floor(rnd() * p.pattern.max);
    for (let i = 0; i < n; i++) {
      const bev = p.pattern.drinks[Math.floor(rnd() * p.pattern.drinks.length)];
      const hour = 18 + Math.floor(i * 1.2 + rnd() * 1.5);
      await insert(bev, rnd() < 0.15 ? 2 : 1, day, `${String(Math.min(hour, 23)).padStart(2, "0")}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}`);
      count++;
    }
  }
  for (const [bev, servings, minutesAgo] of p.today ?? []) {
    const t = new Date(Date.now() - minutesAgo * 60_000);
    const time = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(t);
    await insert(bev, servings, localDay(0), time);
    count++;
  }
  console.log(`${p.name}: ${count} Einträge`);
}

await client.end();
console.log(`Fertig. Anmeldung mit z. B. lena@pegel.demo / ${DEMO_PASSWORD}`);
