-- AlterTable
ALTER TABLE "public"."Word" ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "confidence" SET DEFAULT 1;
