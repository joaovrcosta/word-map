CREATE TABLE "NewsArticle" (
  "id" SERIAL NOT NULL,
  "section" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "imageUrl" TEXT,
  "imageCaption" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");
