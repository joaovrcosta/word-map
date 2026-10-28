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
import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
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

class ContentRevisionDto {
  @IsInt()
  contentLength!: number;

  @IsString()
  contentHash!: string;

  @IsInt()
  normalizationVersion!: number;
}

class ProgressDto {
  @Type(() => Number)
  @IsInt()
  pageIndex!: number;

  @Type(() => Number)
  @IsInt()
  paragraphIndex!: number;

  /** Ausente = app antigo → API zera contentOffset. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contentOffset?: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContentRevisionDto)
  contentRevision?: ContentRevisionDto;
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
    const input: {
      pageIndex: number;
      paragraphIndex: number;
      contentOffset?: number | null;
      contentRevision?: ContentRevisionDto | null;
    } = {
      pageIndex: body.pageIndex,
      paragraphIndex: body.paragraphIndex,
    };
    if (Object.prototype.hasOwnProperty.call(body, "contentOffset")) {
      input.contentOffset = body.contentOffset ?? null;
    }
    if (body.contentRevision) {
      input.contentRevision = body.contentRevision;
    }
    return this.books.saveProgress(id, input);
  }
}
