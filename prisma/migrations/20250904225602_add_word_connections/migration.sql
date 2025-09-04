/*
  Warnings:

  - You are about to drop the column `frequency` on the `Word` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Word" DROP COLUMN "frequency";

-- CreateTable
CREATE TABLE "public"."WordConnection" (
    "id" SERIAL NOT NULL,
    "wordAId" INTEGER NOT NULL,
    "wordBId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "WordConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WordConnection_wordAId_wordBId_key" ON "public"."WordConnection"("wordAId", "wordBId");

-- AddForeignKey
ALTER TABLE "public"."WordConnection" ADD CONSTRAINT "WordConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WordConnection" ADD CONSTRAINT "WordConnection_wordAId_fkey" FOREIGN KEY ("wordAId") REFERENCES "public"."Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WordConnection" ADD CONSTRAINT "WordConnection_wordBId_fkey" FOREIGN KEY ("wordBId") REFERENCES "public"."Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
