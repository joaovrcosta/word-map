import { Module } from "@nestjs/common";
import {
  DictionaryController,
  DictionaryService,
} from "./dictionary.controller";

@Module({
  controllers: [DictionaryController],
  providers: [DictionaryService],
})
export class DictionaryModule {}
