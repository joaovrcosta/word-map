import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  createText,
  deleteText,
  getTextById,
  getUserTexts,
  updateText,
} from "../domain/actions";

@Injectable()
export class TextsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: number) {
    return this.prisma.text.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}

@Injectable()
export class TextsService {
  constructor(private readonly texts: TextsRepository) {}

  create(title: string, content: string) {
    return createText(title, content);
  }

  list() {
    return getUserTexts();
  }

  get(textId: number) {
    return getTextById(textId);
  }

  update(textId: number, title: string, content: string) {
    return updateText(textId, title, content);
  }

  remove(textId: number) {
    return deleteText(textId);
  }
}
