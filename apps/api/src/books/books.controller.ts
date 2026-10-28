import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { IsArray, IsInt, IsOptional, IsString } from "class-validator";
import { BooksService } from "./books.service";

class BookDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;
}

class ChapterDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;
}

class ReorderDto {
  @IsArray()
  chapterIds!: number[];
}

class ProgressDto {
  @IsInt()
  pageIndex!: number;

  @IsInt()
  paragraphIndex!: number;
}

@Controller("books")
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get("official")
  official() {
    return this.books.official();
  }

  @Get("mine")
  mine() {
    return this.books.mine();
  }

  @Get("library")
  library() {
    return this.books.library();
  }

  @Post("official")
  createOfficial(@Body() body: BookDto) {
    return this.books.createOfficial(body.title, body.description, body.coverUrl);
  }

  @Post()
  create(@Body() body: BookDto) {
    return this.books.create(body.title, body.description, body.coverUrl);
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.books.get(id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: BookDto) {
    return this.books.update(id, body.title, body.description, body.coverUrl);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.books.remove(id);
  }

  @Post(":id/library")
  addLibrary(@Param("id", ParseIntPipe) id: number) {
    return this.books.addLibrary(id);
  }

  @Delete(":id/library")
  removeLibrary(@Param("id", ParseIntPipe) id: number) {
    return this.books.removeLibrary(id);
  }

  @Post(":id/chapters/reorder")
  reorder(@Param("id", ParseIntPipe) id: number, @Body() body: ReorderDto) {
    return this.books.reorder(id, body.chapterIds);
  }

  @Post(":id/chapters")
  addChapter(@Param("id", ParseIntPipe) id: number, @Body() body: ChapterDto) {
    return this.books.addChapter(id, body.title, body.content);
  }
}

@Controller("chapters")
export class ChaptersController {
  constructor(private readonly books: BooksService) {}

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.books.chapter(id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: ChapterDto) {
    return this.books.updateChapter(id, body.title, body.content);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.books.deleteChapter(id);
  }

  @Get(":id/progress")
  progress(@Param("id", ParseIntPipe) id: number) {
    return this.books.progress(id);
  }

  @Put(":id/progress")
  saveProgress(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ProgressDto
  ) {
    return this.books.saveProgress(id, body.pageIndex, body.paragraphIndex);
  }
}
