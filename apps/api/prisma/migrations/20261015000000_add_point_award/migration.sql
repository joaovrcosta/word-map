CREATE TABLE "PointAward" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "wordId" INTEGER,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointAward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PointAward_wordId_key" ON "PointAward"("wordId");

CREATE INDEX "PointAward_userId_createdAt_idx" ON "PointAward"("userId", "createdAt");

ALTER TABLE "PointAward" ADD CONSTRAINT "PointAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PointAward" ADD CONSTRAINT "PointAward_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "PointAward" ("userId", "wordId", "points", "createdAt")
SELECT v."userId", w."id", 10, w."createdAt"
FROM "Word" w
JOIN "Vault" v ON v."id" = w."vaultId"
WHERE w."isSaved" = true;
