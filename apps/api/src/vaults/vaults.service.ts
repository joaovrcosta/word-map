import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  createVault,
  deleteVault,
  exportVaultWords,
  getVaults,
  importWordsToVault,
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

  createVault(name: string) {
    return createVault(name);
  }

  deleteVault(vaultId: number) {
    return deleteVault(vaultId);
  }

  updateVaultName(vaultId: number, name: string) {
    return updateVaultName(vaultId, name);
  }

  exportVaultWords(vaultId: number) {
    return exportVaultWords(vaultId);
  }

  importWordsToVault(vaultId: number, importData: string) {
    return importWordsToVault(vaultId, importData);
  }
}
