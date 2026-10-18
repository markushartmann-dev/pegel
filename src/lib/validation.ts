/**
 * Zod-Schemas für alle Eingaben. Werden serverseitig in den Route Handlers verwendet;
 * Formulare im Browser nutzen dieselben Grenzen nur zur Vorabprüfung.
 */
import { z } from "zod";
import { LIMITS } from "./calculations/alcohol";
import { PROFILE_LIMITS } from "./calculations/widmark";
import { isValidClock, isValidDayKey, isValidTimeZone } from "./dates";

const trimmed = (max: number) => z.string().trim().max(max, `Maximal ${max} Zeichen.`);

export const categoryEnum = z.enum(["BEER", "WINE", "SPARKLING", "SPIRITS", "MIXED", "CIDER", "OTHER"]);
export const distributionModelEnum = z.enum([
  "WIDMARK_MALE",
  "WIDMARK_FEMALE",
  "SEIDL_MALE",
  "SEIDL_FEMALE",
  "CUSTOM",
]);
export const genderEnum = z.enum(["MALE", "FEMALE", "DIVERSE", "UNSPECIFIED"]);
export const themeModeEnum = z.enum(["SYSTEM", "LIGHT", "DARK"]);
export const colorSchemeEnum = z.enum(["MIDNIGHT", "OCEAN", "FOREST", "SUNSET", "LIGHT"]);

export const volumeSchema = z.coerce
  .number({ error: "Volumen ist erforderlich." })
  .int("Volumen bitte in ganzen Millilitern angeben.")
  .min(LIMITS.volumeMl.min, "Volumen muss mindestens 1 ml betragen.")
  .max(LIMITS.volumeMl.max, "Volumen darf höchstens 5000 ml betragen.");

export const abvSchema = z.coerce
  .number({ error: "Alkoholgehalt ist erforderlich." })
  .min(0, "Alkoholgehalt darf nicht negativ sein.")
  .max(LIMITS.abv.max, "Alkoholgehalt darf höchstens 96 % vol betragen.")
  .refine((v) => Math.round(v * 10) === v * 10 || Math.abs(Math.round(v * 10) - v * 10) < 1e-9, {
    message: "Alkoholgehalt bitte mit höchstens einer Nachkommastelle angeben.",
  });

export const timezoneSchema = z.string().refine(isValidTimeZone, "Unbekannte Zeitzone.");

export const beverageInputSchema = z.object({
  name: trimmed(60).min(2, "Name muss mindestens 2 Zeichen lang sein."),
  description: trimmed(200).optional().nullable(),
  volumeMl: volumeSchema,
  abv: abvSchema,
  category: categoryEnum.default("OTHER"),
  isFavorite: z.boolean().optional(),
});
export type BeverageInput = z.infer<typeof beverageInputSchema>;

export const beverageUpdateSchema = beverageInputSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const entryInputSchema = z.object({
  beverageId: z.string().min(1, "Bitte ein Getränk auswählen."),
  servings: z.coerce.number().int().min(LIMITS.servings.min).max(LIMITS.servings.max, "Höchstens 20 Portionen pro Eintrag."),
  /** optionale Abweichung nur für diesen Eintrag */
  volumeMl: volumeSchema.optional(),
  abv: abvSchema.optional(),
  /** lokale Zeit "YYYY-MM-DDTHH:mm" in `timezone` */
  consumedAtLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Ungültiger Zeitpunkt."),
  timezone: timezoneSchema,
  note: trimmed(300).optional().nullable(),
  clientRequestId: z.string().uuid().optional(),
});
export type EntryInput = z.infer<typeof entryInputSchema>;

export const entryUpdateSchema = z.object({
  servings: entryInputSchema.shape.servings.optional(),
  volumeMl: volumeSchema.optional(),
  abv: abvSchema.optional(),
  consumedAtLocal: entryInputSchema.shape.consumedAtLocal.optional(),
  timezone: timezoneSchema.optional(),
  note: trimmed(300).optional().nullable(),
});

export const profileInputSchema = z
  .object({
    gender: genderEnum.default("UNSPECIFIED"),
    distributionModel: distributionModelEnum,
    customFactor: z.coerce.number().min(PROFILE_LIMITS.factor.min).max(PROFILE_LIMITS.factor.max).optional().nullable(),
    weightKg: z.coerce
      .number({ error: "Gewicht ist erforderlich." })
      .min(PROFILE_LIMITS.weightKg.min, "Gewicht muss mindestens 30 kg betragen.")
      .max(PROFILE_LIMITS.weightKg.max, "Gewicht darf höchstens 300 kg betragen."),
    heightCm: z.coerce
      .number({ error: "Größe ist erforderlich." })
      .int("Größe bitte in ganzen Zentimetern angeben.")
      .min(PROFILE_LIMITS.heightCm.min, "Größe muss mindestens 120 cm betragen.")
      .max(PROFILE_LIMITS.heightCm.max, "Größe darf höchstens 230 cm betragen."),
    timezone: timezoneSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.distributionModel === "CUSTOM" && (v.customFactor === undefined || v.customFactor === null)) {
      ctx.addIssue({ code: "custom", path: ["customFactor"], message: "Bitte einen eigenen Faktor (0,40–0,90) angeben." });
    }
  });

export const onboardingSchema = z.object({
  profile: profileInputSchema,
  timezone: timezoneSchema,
  themeMode: themeModeEnum.optional(),
  colorScheme: colorSchemeEnum.optional(),
  /** Community-Ranking: standardmäßig aktiv, im Onboarding abwählbar */
  communityOptIn: z.boolean().default(true),
  acceptPrivacy: z.literal(true, { error: "Bitte die Datenschutzhinweise bestätigen." }),
  acceptHealthData: z.literal(true, {
    error: "Ohne Einwilligung in die Verarbeitung der Konsumdaten kann die App nicht genutzt werden.",
  }),
});

export const settingsSchema = z.object({
  name: trimmed(50).min(2, "Anzeigename muss mindestens 2 Zeichen lang sein.").optional(),
  timezone: timezoneSchema.optional(),
  themeMode: themeModeEnum.optional(),
  colorScheme: colorSchemeEnum.optional(),
});

export const communitySchema = z
  .object({
    optIn: z.boolean(),
    display: z.enum(["PSEUDONYM", "DISPLAY_NAME"]).default("PSEUDONYM"),
    pseudonym: trimmed(30).min(2, "Pseudonym muss mindestens 2 Zeichen lang sein.").optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.optIn && v.display === "PSEUDONYM" && !v.pseudonym) {
      ctx.addIssue({ code: "custom", path: ["pseudonym"], message: "Bitte ein Pseudonym angeben." });
    }
  });

export const notificationSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().refine(isValidClock, "Uhrzeit im Format HH:MM angeben.").optional(),
  weeklySummaryEnabled: z.boolean().optional(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://", "Push-Endpunkt muss HTTPS verwenden.").max(1000),
  keys: z.object({
    p256dh: z.string().min(10).max(200),
    auth: z.string().min(8).max(100),
  }),
});

export const dayKeySchema = z.string().refine(isValidDayKey, "Ungültiges Datum.");

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
  beverageId: z.string().max(40).optional(),
  from: dayKeySchema.optional(),
  to: dayKeySchema.optional(),
});

export const adminUserQuerySchema = z.object({
  q: trimmed(100).optional(),
  status: z.enum(["ACTIVE", "DEACTIVATED"]).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

export const adminUserUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "DEACTIVATED"]).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export const auditQuerySchema = z.object({
  q: trimmed(100).optional(),
  severity: z.enum(["INFO", "WARNING", "SECURITY", "ERROR"]).optional(),
  userId: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
});

export const passwordSchema = z
  .string()
  .min(10, "Passwort muss mindestens 10 Zeichen lang sein.")
  .max(128, "Passwort darf höchstens 128 Zeichen lang sein.");

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Bitte Passwort eingeben."),
  confirm: z.literal("LÖSCHEN", { error: 'Bitte zur Bestätigung "LÖSCHEN" eingeben.' }),
});

/** Zod-Fehler in ein flaches Feld → Meldung-Objekt umwandeln. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
