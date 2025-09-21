-- CreateTable
CREATE TABLE "public"."Sentence" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Sentence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SentenceWord" (
    "id" SERIAL NOT NULL,
    "sentenceId" INTEGER NOT NULL,
    "wordId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "highlightColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentenceWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SentenceWord_sentenceId_wordId_key" ON "public"."SentenceWord"("sentenceId", "wordId");

-- AddForeignKey
ALTER TABLE "public"."Sentence" ADD CONSTRAINT "Sentence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SentenceWord" ADD CONSTRAINT "SentenceWord_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "public"."Sentence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SentenceWord" ADD CONSTRAINT "SentenceWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "public"."Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
