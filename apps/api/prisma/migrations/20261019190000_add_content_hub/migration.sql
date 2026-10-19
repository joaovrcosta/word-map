-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MODERATOR';

-- CreateEnum
CREATE TYPE "ContentLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- AlterTable
ALTER TABLE "Text" ADD COLUMN "summary" TEXT,
ADD COLUMN "level" "ContentLevel",
ADD COLUMN "isCatalog" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Text_isCatalog_level_idx" ON "Text"("isCatalog", "level");
