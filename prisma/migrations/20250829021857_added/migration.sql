/*
  Warnings:

  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "public"."Vault" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Vault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Word" (
    "id" SERIAL NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "grammaticalClass" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "translations" TEXT[],
    "lastPractice" TIMESTAMP(3),
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vaultId" INTEGER NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WordHistory" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "wordId" INTEGER NOT NULL,

    CONSTRAINT "WordHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_RelatedWords" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_RelatedWords_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_RelatedWords_B_index" ON "public"."_RelatedWords"("B");

-- AddForeignKey
ALTER TABLE "public"."Vault" ADD CONSTRAINT "Vault_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Word" ADD CONSTRAINT "Word_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "public"."Vault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WordHistory" ADD CONSTRAINT "WordHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WordHistory" ADD CONSTRAINT "WordHistory_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "public"."Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_RelatedWords" ADD CONSTRAINT "_RelatedWords_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_RelatedWords" ADD CONSTRAINT "_RelatedWords_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
