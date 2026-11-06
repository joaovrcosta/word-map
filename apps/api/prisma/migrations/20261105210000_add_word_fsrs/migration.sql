-- AlterTable
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "fsrsState" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "stability" DOUBLE PRECISION;
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "difficulty" DOUBLE PRECISION;
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMP(3);
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "scheduledDays" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "learningSteps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "reps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "lapses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "lastReview" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Word_dueAt_idx" ON "Word"("dueAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "WordFsrsReviewLog" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "clientReviewId" TEXT,
    "rating" INTEGER NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "state" INTEGER NOT NULL,
    "stability" DOUBLE PRECISION NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "scheduledDays" DOUBLE PRECISION,
    "learningSteps" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'recall',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordFsrsReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WordFsrsReviewLog_clientReviewId_key" ON "WordFsrsReviewLog"("clientReviewId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WordFsrsReviewLog_wordId_reviewedAt_idx" ON "WordFsrsReviewLog"("wordId", "reviewedAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WordFsrsReviewLog_wordId_fkey'
  ) THEN
    ALTER TABLE "WordFsrsReviewLog"
      ADD CONSTRAINT "WordFsrsReviewLog_wordId_fkey"
      FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
