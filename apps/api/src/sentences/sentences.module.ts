import { Module } from "@nestjs/common";
import { SentencesController } from "./sentences.controller";
import { SentencesRepository, SentencesService } from "./sentences.service";

@Module({
  controllers: [SentencesController],
  providers: [SentencesRepository, SentencesService],
})
export class SentencesModule {}
