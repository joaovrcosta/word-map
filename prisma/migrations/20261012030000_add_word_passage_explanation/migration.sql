-- CreateTable
CREATE TABLE "WordPassageExplanation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "wordId" INTEGER,
    "passageKey" TEXT NOT NULL,
    "span" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordPassageExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WordPassageExplanation_userId_passageKey_key" ON "WordPassageExplanation"("userId", "passageKey");

-- CreateIndex
CREATE INDEX "WordPassageExplanation_wordId_idx" ON "WordPassageExplanation"("wordId");

-- AddForeignKey
ALTER TABLE "WordPassageExplanation" ADD CONSTRAINT "WordPassageExplanation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordPassageExplanation" ADD CONSTRAINT "WordPassageExplanation_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE SET NULL ON UPDATE CASCADE;
