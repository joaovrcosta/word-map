import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { IsArray, IsOptional, IsString } from "class-validator";
import { Roles } from "../common/roles.decorator";
import { HubService } from "./hub.service";

class BookDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
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

class TextDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  level?: string;
}

class RoleDto {
  @IsString()
  role!: string;
}

@Roles("ADMIN", "MODERATOR")
@Controller("hub")
export class HubController {
  constructor(private readonly hub: HubService) {}

  @Get("books")
  books() {
    return this.hub.listBooks();
  }

  @Post("books")
  createBook(@Body() body: BookDto) {
    return this.hub.createBook(body.title, body.description);
  }

  @Get("books/:id")
  book(@Param("id", ParseIntPipe) id: number) {
    return this.hub.book(id);
  }

  @Patch("books/:id")
  updateBook(@Param("id", ParseIntPipe) id: number, @Body() body: BookDto) {
    return this.hub.updateBook(id, body.title, body.description);
  }

  @Delete("books/:id")
  removeBook(@Param("id", ParseIntPipe) id: number) {
    return this.hub.removeBook(id);
  }

  @Post("books/:id/chapters/reorder")
  reorder(@Param("id", ParseIntPipe) id: number, @Body() body: ReorderDto) {
    return this.hub.reorder(id, body.chapterIds);
  }

  @Post("books/:id/chapters")
  addChapter(@Param("id", ParseIntPipe) id: number, @Body() body: ChapterDto) {
    return this.hub.addChapter(id, body.title, body.content);
  }

  @Patch("chapters/:id")
  updateChapter(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ChapterDto
  ) {
    return this.hub.updateChapter(id, body.title, body.content);
  }

  @Delete("chapters/:id")
  removeChapter(@Param("id", ParseIntPipe) id: number) {
    return this.hub.removeChapter(id);
  }

  @Get("texts")
  texts() {
    return this.hub.listTexts();
  }

  @Post("texts")
  createText(@Body() body: TextDto) {
    return this.hub.createText(body);
  }

  @Get("texts/:id")
  text(@Param("id", ParseIntPipe) id: number) {
    return this.hub.text(id);
  }

  @Patch("texts/:id")
  updateText(@Param("id", ParseIntPipe) id: number, @Body() body: TextDto) {
    return this.hub.updateText(id, body);
  }

  @Delete("texts/:id")
  removeText(@Param("id", ParseIntPipe) id: number) {
    return this.hub.removeText(id);
  }

  @Roles("ADMIN")
  @Get("staff")
  staff() {
    return this.hub.listStaff();
  }

  @Roles("ADMIN")
  @Patch("staff/:id")
  updateRole(@Param("id", ParseIntPipe) id: number, @Body() body: RoleDto) {
    return this.hub.updateRole(id, body.role);
  }
}
