-- CreateTable
CREATE TABLE "VaultLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vaultId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VaultLike_vaultId_idx" ON "VaultLike"("vaultId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultLike_userId_vaultId_key" ON "VaultLike"("userId", "vaultId");

-- AddForeignKey
ALTER TABLE "VaultLike" ADD CONSTRAINT "VaultLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultLike" ADD CONSTRAINT "VaultLike_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;
