import { Module } from "@nestjs/common";
import { BooksController, ChaptersController } from "./books.controller";
import { BooksRepository, BooksService } from "./books.service";

@Module({
  controllers: [BooksController, ChaptersController],
  providers: [BooksRepository, BooksService],
})
export class BooksModule {}
