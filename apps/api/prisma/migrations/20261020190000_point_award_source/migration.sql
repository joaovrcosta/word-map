ALTER TABLE "PointAward" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'saved_word';
ALTER TABLE "PointAward" ADD COLUMN "dedupeKey" TEXT;

UPDATE "PointAward"
SET "dedupeKey" = 'saved:' || "wordId"::text
WHERE "wordId" IS NOT NULL;

UPDATE "PointAward"
SET "dedupeKey" = 'legacy:' || "id"::text
WHERE "dedupeKey" IS NULL;

ALTER TABLE "PointAward" ALTER COLUMN "dedupeKey" SET NOT NULL;

DROP INDEX "PointAward_wordId_key";

CREATE UNIQUE INDEX "PointAward_dedupeKey_key" ON "PointAward"("dedupeKey");
