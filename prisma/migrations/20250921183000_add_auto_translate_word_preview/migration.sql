-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "autoTranslateWordPreview" BOOLEAN NOT NULL DEFAULT false;
