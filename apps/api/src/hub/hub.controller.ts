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
import { IsArray, IsBoolean, IsInt, IsOptional, IsString } from "class-validator";
import { Roles } from "../common/roles.decorator";
import { HubService } from "./hub.service";

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

class StoryDto {
  @IsString()
  title!: string;

  @IsString()
  theme!: string;

  @IsOptional()
  @IsInt()
  bookId?: number | null;
}

class PublishStoryDto {
  @IsBoolean()
  published!: boolean;
}

class StoryStepDto {
  @IsOptional()
  @IsString()
  speaker?: string;

  @IsString()
  text!: string;

  @IsString()
  translation!: string;

  @IsOptional()
  challenge?: unknown;
}

class StoryReorderDto {
  @IsArray()
  @IsInt({ each: true })
  stepIds!: number[];
}

class NewsDto {
  @IsString()
  section!: string;

  @IsString()
  title!: string;

  @IsString()
  summary!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  imageCaption?: string;

  @IsOptional()
  tags?: string[] | string;
}

class PublishNewsDto {
  @IsBoolean()
  published!: boolean;
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
    return this.hub.createBook(body.title, body.description, body.coverUrl);
  }

  @Get("books/:id")
  book(@Param("id", ParseIntPipe) id: number) {
    return this.hub.book(id);
  }

  @Patch("books/:id")
  updateBook(@Param("id", ParseIntPipe) id: number, @Body() body: BookDto) {
    return this.hub.updateBook(id, body.title, body.description, body.coverUrl);
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

  @Get("stories")
  stories() {
    return this.hub.listStories();
  }

  @Post("stories")
  createStory(@Body() body: StoryDto) {
    return this.hub.createStory(body);
  }

  @Get("stories/:id")
  story(@Param("id", ParseIntPipe) id: number) {
    return this.hub.story(id);
  }

  @Patch("stories/:id")
  updateStory(@Param("id", ParseIntPipe) id: number, @Body() body: StoryDto) {
    return this.hub.updateStory(id, body);
  }

  @Post("stories/:id/publish")
  publishStory(@Param("id", ParseIntPipe) id: number, @Body() body: PublishStoryDto) {
    return this.hub.publishStory(id, body.published);
  }

  @Delete("stories/:id")
  removeStory(@Param("id", ParseIntPipe) id: number) {
    return this.hub.removeStory(id);
  }

  @Post("stories/:id/steps/reorder")
  reorderStorySteps(@Param("id", ParseIntPipe) id: number, @Body() body: StoryReorderDto) {
    return this.hub.reorderStorySteps(id, body.stepIds);
  }

  @Post("stories/:id/steps")
  addStoryStep(@Param("id", ParseIntPipe) id: number, @Body() body: StoryStepDto) {
    return this.hub.addStoryStep(id, body);
  }

  @Patch("steps/:id")
  updateStoryStep(@Param("id", ParseIntPipe) id: number, @Body() body: StoryStepDto) {
    return this.hub.updateStoryStep(id, body);
  }

  @Delete("steps/:id")
  removeStoryStep(@Param("id", ParseIntPipe) id: number) {
    return this.hub.removeStoryStep(id);
  }

  @Get("news")
  newsList() {
    return this.hub.listNews();
  }

  @Post("news")
  createNews(@Body() body: NewsDto) {
    return this.hub.createNews(body);
  }

  @Get("news/:id")
  news(@Param("id", ParseIntPipe) id: number) {
    return this.hub.news(id);
  }

  @Patch("news/:id")
  updateNews(@Param("id", ParseIntPipe) id: number, @Body() body: NewsDto) {
    return this.hub.updateNews(id, body);
  }

  @Post("news/:id/publish")
  publishNews(@Param("id", ParseIntPipe) id: number, @Body() body: PublishNewsDto) {
    return this.hub.publishNews(id, body.published);
  }

  @Delete("news/:id")
  removeNews(@Param("id", ParseIntPipe) id: number) {
    return this.hub.removeNews(id);
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
