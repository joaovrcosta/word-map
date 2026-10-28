-- AlterTable Chapter: revision fields for stable reading progress
ALTER TABLE "Chapter" ADD COLUMN "contentLength" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Chapter" ADD COLUMN "contentHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Chapter" ADD COLUMN "normalizationVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable ReadingProgress: contentOffset + monotonic completion
ALTER TABLE "ReadingProgress" ADD COLUMN "contentOffset" INTEGER;
ALTER TABLE "ReadingProgress" ADD COLUMN "reachedEndAt" TIMESTAMP(3);
