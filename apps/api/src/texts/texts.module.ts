import { Module } from "@nestjs/common";
import { TextsController } from "./texts.controller";
import { TextsRepository, TextsService } from "./texts.service";

@Module({
  controllers: [TextsController],
  providers: [TextsRepository, TextsService],
})
export class TextsModule {}
