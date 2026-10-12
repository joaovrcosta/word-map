-- CreateTable
CREATE TABLE "WordOrigin" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "meaning" TEXT NOT NULL,
    "sentence" TEXT,
    "sourceTitle" TEXT,
    "sourceKind" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordOrigin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WordOrigin_wordId_createdAt_idx" ON "WordOrigin"("wordId", "createdAt");

-- AddForeignKey
ALTER TABLE "WordOrigin" ADD CONSTRAINT "WordOrigin_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
