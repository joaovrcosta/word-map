DROP TABLE IF EXISTS "StoryOption" CASCADE;
DROP TABLE IF EXISTS "StoryChallenge" CASCADE;
DROP TABLE IF EXISTS "StoryProgress" CASCADE;
DROP TABLE IF EXISTS "StoryStep" CASCADE;
DROP TABLE IF EXISTS "StoryChapter" CASCADE;
DROP TABLE IF EXISTS "Story" CASCADE;
DROP TYPE IF EXISTS "StoryChallengeKind";
DROP TYPE IF EXISTS "StoryBadge";

CREATE TYPE "StoryChallengeKind" AS ENUM ('TRUE_FALSE', 'CHOICE');

CREATE TABLE "Story" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "theme" TEXT NOT NULL,
  "bookId" INTEGER,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryStep" (
  "id" SERIAL NOT NULL,
  "storyId" INTEGER NOT NULL,
  "order" INTEGER NOT NULL,
  "speaker" TEXT,
  "text" TEXT NOT NULL,
  "translation" TEXT NOT NULL,
  CONSTRAINT "StoryStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryChallenge" (
  "id" SERIAL NOT NULL,
  "stepId" INTEGER NOT NULL,
  "kind" "StoryChallengeKind" NOT NULL,
  "prompt" TEXT NOT NULL,
  "correct" BOOLEAN,
  CONSTRAINT "StoryChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryOption" (
  "id" SERIAL NOT NULL,
  "challengeId" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "correct" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "StoryOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryAttempt" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "challengeId" INTEGER NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryCompletion" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "storyId" INTEGER NOT NULL,
  "correctCount" INTEGER NOT NULL,
  "challengeCount" INTEGER NOT NULL,
  "points" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryCompletion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Story_publishedAt_idx" ON "Story"("publishedAt");
CREATE INDEX "StoryStep_storyId_order_idx" ON "StoryStep"("storyId", "order");
CREATE UNIQUE INDEX "StoryChallenge_stepId_key" ON "StoryChallenge"("stepId");
CREATE UNIQUE INDEX "StoryAttempt_userId_challengeId_key" ON "StoryAttempt"("userId", "challengeId");
CREATE UNIQUE INDEX "StoryCompletion_userId_storyId_key" ON "StoryCompletion"("userId", "storyId");

ALTER TABLE "Story" ADD CONSTRAINT "Story_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoryStep" ADD CONSTRAINT "StoryStep_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryChallenge" ADD CONSTRAINT "StoryChallenge_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "StoryStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryOption" ADD CONSTRAINT "StoryOption_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "StoryChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryAttempt" ADD CONSTRAINT "StoryAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryAttempt" ADD CONSTRAINT "StoryAttempt_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "StoryChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryCompletion" ADD CONSTRAINT "StoryCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryCompletion" ADD CONSTRAINT "StoryCompletion_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
