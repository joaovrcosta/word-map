-- CreateTable
CREATE TABLE "public"."SemanticConnection" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "SemanticConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SemanticConnectionWord" (
    "id" SERIAL NOT NULL,
    "connectionId" INTEGER NOT NULL,
    "wordId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SemanticConnectionWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SemanticConnectionWord_connectionId_wordId_key" ON "public"."SemanticConnectionWord"("connectionId", "wordId");

-- AddForeignKey
ALTER TABLE "public"."SemanticConnection" ADD CONSTRAINT "SemanticConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SemanticConnectionWord" ADD CONSTRAINT "SemanticConnectionWord_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."SemanticConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SemanticConnectionWord" ADD CONSTRAINT "SemanticConnectionWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "public"."Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
