import { Module } from "@nestjs/common";
import { FlashcardsController } from "./flashcards.controller";
import { FlashcardsRepository, FlashcardsService } from "./flashcards.service";

@Module({
  controllers: [FlashcardsController],
  providers: [FlashcardsRepository, FlashcardsService],
})
export class FlashcardsModule {}
