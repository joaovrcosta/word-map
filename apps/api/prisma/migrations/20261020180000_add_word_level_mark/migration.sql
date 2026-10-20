-- CreateTable
CREATE TABLE "WordLevelMark" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordLevelMark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WordLevelMark_wordId_createdAt_idx" ON "WordLevelMark"("wordId", "createdAt");

-- AddForeignKey
ALTER TABLE "WordLevelMark" ADD CONSTRAINT "WordLevelMark_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
