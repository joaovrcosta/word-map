-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "dailyGoalMinutes" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "UserSettings" ADD COLUMN "currentStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserSettings" ADD COLUMN "bestStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserSettings" ADD COLUMN "lastGoalDate" TEXT;
ALTER TABLE "UserSettings" ADD COLUMN "creditedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StudyDay" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "readingSeconds" INTEGER NOT NULL DEFAULT 0,
    "practiceSeconds" INTEGER NOT NULL DEFAULT 0,
    "goalMinutes" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyDay_userId_day_key" ON "StudyDay"("userId", "day");

-- AddForeignKey
ALTER TABLE "StudyDay" ADD CONSTRAINT "StudyDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
