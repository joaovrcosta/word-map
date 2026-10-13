import { Module } from "@nestjs/common";
import {
  TranslateController,
  TranslateService,
} from "./translate.controller";

@Module({
  controllers: [TranslateController],
  providers: [TranslateService],
})
export class TranslateModule {}
