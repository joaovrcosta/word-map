import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  checkTextWords,
  createWord,
  deleteWord,
  getAllWordRelations,
  getLinkableWords,
  getRelatedWords,
  incrementWordFrequency,
  linkWords,
  moveWordToVault,
  previewPhrasalCanonical,
  removeWordFromVault,
  resolveSelectionSave,
  searchWordInVaults,
  unlinkWords,
  unsaveWord,
  updateWord,
  wordExistsInVault,
  type CreateWordData,
} from "../domain/actions";
import { listWordOrigins, recordWordOrigin } from "../domain/word-origins";
import type { WordOriginKind } from "@word-map/shared/word-origin";
import type { SelectionSaveType } from "../domain/actions";

@Injectable()
export class WordsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwned(userId: number, wordId: number) {
    return this.prisma.word.findFirst({
      where: { id: wordId, vault: { userId } },
    });
  }
}

@Injectable()
export class WordsService {
  constructor(private readonly words: WordsRepository) {}

  create(data: CreateWordData) {
    return createWord(data);
  }

  search(term: string) {
    return searchWordInVaults(term);
  }

  exists(wordName: string, vaultId: number) {
    return wordExistsInVault(wordName, vaultId);
  }

  move(wordId: number, vaultId: number) {
    return moveWordToVault(wordId, vaultId);
  }

  unsave(wordId: number) {
    return unsaveWord(wordId);
  }

  remove(wordId: number) {
    return deleteWord(wordId);
  }

  removeFromVault(wordName: string, vaultId: number, wordId?: number) {
    return removeWordFromVault(wordName, vaultId, wordId);
  }

  update(wordId: number, data: Parameters<typeof updateWord>[1]) {
    return updateWord(wordId, data);
  }

  link(wordId1: number, wordId2: number) {
    return linkWords(wordId1, wordId2);
  }

  unlink(wordId1: number, wordId2: number) {
    return unlinkWords(wordId1, wordId2);
  }

  related(wordId: number) {
    return getRelatedWords(wordId);
  }

  linkable(
    wordId: number,
    currentVaultId?: number,
    useAllVaultsForLinks = false
  ) {
    return getLinkableWords(wordId, currentVaultId, useAllVaultsForLinks);
  }

  relations() {
    return getAllWordRelations();
  }

  checkText(content: string) {
    return checkTextWords(content);
  }

  resolveSelection(selectedText: string, saveType: SelectionSaveType) {
    return resolveSelectionSave(selectedText, saveType);
  }

  previewPhrasal(selectedText: string) {
    return previewPhrasalCanonical(selectedText);
  }

  incrementFrequency(wordId: number) {
    return incrementWordFrequency(wordId);
  }

  origins(wordId: number) {
    return listWordOrigins(wordId);
  }

  recordOrigin(input: {
    wordId?: number;
    wordName: string;
    vaultId?: number;
    meaning: string;
    sentence?: string | null;
    sourceTitle?: string | null;
    sourceKind?: WordOriginKind;
  }) {
    return recordWordOrigin(input);
  }
}
