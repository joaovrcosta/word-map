import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  createSentence,
  deleteSentence,
  getSentenceById,
  getUserSentences,
  getWordsForSentenceBuilder,
  updateSentence,
  type CreateSentenceData,
} from "../domain/sentences";

@Injectable()
export class SentencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: number) {
    return this.prisma.sentence.findMany({ where: { userId } });
  }
}

@Injectable()
export class SentencesService {
  constructor(private readonly sentences: SentencesRepository) {}

  create(data: CreateSentenceData) {
    return createSentence(data);
  }

  list() {
    return getUserSentences();
  }

  get(id: number) {
    return getSentenceById(id);
  }

  update(id: number, data: CreateSentenceData) {
    return updateSentence(id, data);
  }

  remove(id: number) {
    return deleteSentence(id);
  }

  words() {
    return getWordsForSentenceBuilder();
  }
}
