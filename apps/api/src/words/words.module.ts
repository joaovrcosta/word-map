import { Module } from "@nestjs/common";
import { WordsController } from "./words.controller";
import { WordsRepository, WordsService } from "./words.service";

@Module({
  controllers: [WordsController],
  providers: [WordsRepository, WordsService],
})
export class WordsModule {}
