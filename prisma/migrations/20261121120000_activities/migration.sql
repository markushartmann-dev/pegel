-- Sport-Tracking (1.6)

-- CreateEnum
CREATE TYPE "ActivityIntensity" AS ENUM ('LIGHT', 'MODERATE', 'VIGOROUS');

-- AlterTable: bestehende Konten bekommen einmalig einen Hinweis (NULL = noch nicht gesehen)
ALTER TABLE "user" ADD COLUMN "sportNoticeDismissedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "activity_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "defaultIntensity" "ActivityIntensity" NOT NULL DEFAULT 'MODERATE',
    "ownerId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "suggestionStatus" "SuggestionStatus" NOT NULL DEFAULT 'NONE',
    "suggestedAt" TIMESTAMPTZ(3),
    "suggestedById" TEXT,
    "suggestionNote" TEXT,
    "reviewedAt" TIMESTAMPTZ(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "activity_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityTypeId" TEXT,
    "activityName" TEXT NOT NULL,
    "icon" TEXT,
    "durationMin" INTEGER NOT NULL,
    "intensity" "ActivityIntensity" NOT NULL,
    "performedAt" TIMESTAMPTZ(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "note" TEXT,
    "clientRequestId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "activity_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_type_ownerId_name_key" ON "activity_type"("ownerId", "name");
CREATE INDEX "activity_type_ownerId_isActive_idx" ON "activity_type"("ownerId", "isActive");
CREATE INDEX "activity_type_isDefault_isActive_idx" ON "activity_type"("isDefault", "isActive");
CREATE INDEX "activity_type_suggestionStatus_idx" ON "activity_type"("suggestionStatus");
CREATE UNIQUE INDEX "activity_entry_userId_clientRequestId_key" ON "activity_entry"("userId", "clientRequestId");
CREATE INDEX "activity_entry_userId_performedAt_idx" ON "activity_entry"("userId", "performedAt");
CREATE INDEX "activity_entry_activityTypeId_idx" ON "activity_entry"("activityTypeId");
CREATE INDEX "activity_entry_performedAt_idx" ON "activity_entry"("performedAt");

-- AddForeignKey
ALTER TABLE "activity_type" ADD CONSTRAINT "activity_type_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_type" ADD CONSTRAINT "activity_type_suggestedById_fkey" FOREIGN KEY ("suggestedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activity_entry" ADD CONSTRAINT "activity_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_entry" ADD CONSTRAINT "activity_entry_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;
