-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('NONE', 'PENDING', 'REJECTED', 'APPROVED');

-- AlterTable
ALTER TABLE "beverage" ADD COLUMN "suggestionStatus" "SuggestionStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "suggestedAt" TIMESTAMPTZ(3),
ADD COLUMN "suggestedById" TEXT,
ADD COLUMN "suggestionNote" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "beverage_suggestionStatus_idx" ON "beverage"("suggestionStatus");

-- AddForeignKey
ALTER TABLE "beverage" ADD CONSTRAINT "beverage_suggestedById_fkey" FOREIGN KEY ("suggestedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
