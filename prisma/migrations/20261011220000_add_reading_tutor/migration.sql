-- CreateTable
CREATE TABLE "ReadingProgress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "chapterId" INTEGER NOT NULL,
    "pageIndex" INTEGER NOT NULL,
    "paragraphIndex" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingExplanation" (
    "id" SERIAL NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorQuota" (
    "userId" INTEGER NOT NULL,
    "minuteStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minuteCount" INTEGER NOT NULL DEFAULT 0,
    "dayStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dayCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TutorQuota_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadingProgress_userId_chapterId_key" ON "ReadingProgress"("userId", "chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingExplanation_cacheKey_key" ON "ReadingExplanation"("cacheKey");

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorQuota" ADD CONSTRAINT "TutorQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
