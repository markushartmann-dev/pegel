import "server-only";
import { z } from "zod";
import { prisma } from "../db";
import { audit } from "../audit";
import type { BodyProfile } from "@/lib/calculations/widmark";
import { onboardingSchema, profileInputSchema } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

export const CONSENT_VERSION = "2026-10";

type ProfileInput = z.infer<typeof profileInputSchema>;

export function toBodyProfile(p: {
  distributionModel: string;
  weightKg: unknown;
  heightCm: number;
  customFactor?: unknown;
} | null): BodyProfile | null {
  if (!p) return null;
  return {
    distributionModel: p.distributionModel as BodyProfile["distributionModel"],
    weightKg: Number(p.weightKg),
    heightCm: p.heightCm,
    customFactor: p.customFactor === null || p.customFactor === undefined ? null : Number(p.customFactor),
  };
}

export async function getProfile(userId: string) {
  const p = await prisma.userProfile.findUnique({ where: { userId } });
  if (!p) return null;
  return {
    gender: p.gender,
    distributionModel: p.distributionModel,
    customFactor: p.customFactor === null ? null : Number(p.customFactor),
    weightKg: Number(p.weightKg),
    heightCm: p.heightCm,
    updatedAt: p.updatedAt,
  };
}

export async function getBodyProfile(userId: string): Promise<BodyProfile | null> {
  return toBodyProfile(await prisma.userProfile.findUnique({ where: { userId } }));
}

/** Profil, das zu einem Zeitpunkt gültig war (für historische Schätzungen). */
export async function getBodyProfileAt(userId: string, at: Date): Promise<BodyProfile | null> {
  const rev = await prisma.userProfileRevision.findFirst({
    where: { userId, validFrom: { lte: at } },
    orderBy: { validFrom: "desc" },
  });
  if (rev) return toBodyProfile(rev);
  // Vor der ersten Revision: ältestes bekanntes Profil verwenden
  const first = await prisma.userProfileRevision.findFirst({ where: { userId }, orderBy: { validFrom: "asc" } });
  return toBodyProfile(first);
}

async function writeProfile(tx: Prisma.TransactionClient, userId: string, input: ProfileInput) {
  const data = {
    gender: input.gender,
    distributionModel: input.distributionModel,
    customFactor: input.distributionModel === "CUSTOM" ? input.customFactor ?? null : null,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
  };
  const previous = await tx.userProfile.findUnique({ where: { userId } });
  await tx.userProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  const changed =
    !previous ||
    previous.distributionModel !== data.distributionModel ||
    Number(previous.weightKg) !== data.weightKg ||
    previous.heightCm !== data.heightCm ||
    Number(previous.customFactor ?? 0) !== Number(data.customFactor ?? 0);
  if (changed) {
    await tx.userProfileRevision.create({
      data: {
        userId,
        distributionModel: data.distributionModel,
        customFactor: data.customFactor,
        weightKg: data.weightKg,
        heightCm: data.heightCm,
      },
    });
  }
  return changed;
}

export async function updateProfile(userId: string, raw: unknown, headers?: Headers) {
  const input = profileInputSchema.parse(raw);
  await prisma.$transaction(async (tx) => {
    const changed = await writeProfile(tx, userId, input);
    await tx.user.update({
      where: { id: userId },
      data: { profileUpdatedAt: new Date(), ...(input.timezone ? { timezone: input.timezone } : {}) },
    });
    await audit(
      { action: "profile.updated", actorId: userId, targetUserId: userId, headers, metadata: { calculationParamsChanged: changed } },
      tx,
    );
  });
  return getProfile(userId);
}

export async function completeOnboarding(userId: string, raw: unknown, headers?: Headers) {
  const input = onboardingSchema.parse(raw);
  await prisma.$transaction(async (tx) => {
    await writeProfile(tx, userId, input.profile);
    await tx.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        profileUpdatedAt: new Date(),
        timezone: input.timezone,
        ...(input.themeMode ? { themeMode: input.themeMode } : {}),
        ...(input.colorScheme ? { colorScheme: input.colorScheme } : {}),
        communityOptIn: input.communityOptIn,
      },
    });
    await tx.userConsent.createMany({
      data: [
        { userId, type: "PRIVACY_NOTICE", granted: true, version: CONSENT_VERSION },
        { userId, type: "HEALTH_DATA_PROCESSING", granted: true, version: CONSENT_VERSION },
        { userId, type: "COMMUNITY_RANKING", granted: input.communityOptIn, version: CONSENT_VERSION },
      ],
    });
    await audit({ action: "profile.onboarding_completed", actorId: userId, targetUserId: userId, headers }, tx);
  });
}
