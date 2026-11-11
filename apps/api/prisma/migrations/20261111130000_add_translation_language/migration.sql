-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "translationLanguage" TEXT NOT NULL DEFAULT 'pt';
