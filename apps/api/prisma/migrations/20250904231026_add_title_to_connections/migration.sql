/*
  Warnings:

  - Added the required column `title` to the `WordConnection` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."WordConnection_wordAId_wordBId_key";

-- AlterTable
ALTER TABLE "public"."WordConnection" ADD COLUMN     "title" TEXT NOT NULL;
