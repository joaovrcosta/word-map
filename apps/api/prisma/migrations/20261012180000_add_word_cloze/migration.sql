-- CreateTable
CREATE TABLE "WordCloze" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "variant" INTEGER NOT NULL DEFAULT 1,
    "sentence" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordCloze_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WordCloze_wordId_variant_key" ON "WordCloze"("wordId", "variant");

-- AddForeignKey
ALTER TABLE "WordCloze" ADD CONSTRAINT "WordCloze_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
