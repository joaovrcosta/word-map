import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  createVault,
  deleteVault,
  exportVaultWords,
  getVaults,
  importWordsToVault,
  searchPublicVaults,
  updateVaultName,
} from "../domain/actions";

@Injectable()
export class VaultsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: number) {
    return this.prisma.vault.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}

@Injectable()
export class VaultsService {
  constructor(private readonly vaults: VaultsRepository) {}

  getVaults() {
    return getVaults();
  }

  searchPublicVaults(term: string) {
    return searchPublicVaults(term);
  }

  createVault(name: string, options?: { isPublic?: boolean }) {
    return createVault(name, options);
  }

  deleteVault(vaultId: number) {
    return deleteVault(vaultId);
  }

  updateVaultName(vaultId: number, name: string, options?: { isPublic?: boolean }) {
    return updateVaultName(vaultId, name, options);
  }

  exportVaultWords(vaultId: number) {
    return exportVaultWords(vaultId);
  }

  importWordsToVault(vaultId: number, importData: string) {
    return importWordsToVault(vaultId, importData);
  }
}
