-- CreateTable
CREATE TABLE "WordReview" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "challenge" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WordReview_wordId_idx" ON "WordReview"("wordId");

-- AddForeignKey
ALTER TABLE "WordReview" ADD CONSTRAINT "WordReview_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
