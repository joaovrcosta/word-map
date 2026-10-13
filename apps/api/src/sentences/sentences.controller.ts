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
import { SentencesService } from "./sentences.service";
import type { CreateSentenceData } from "../domain/sentences";

class SentenceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  words!: CreateSentenceData["words"];
}

@Controller("sentences")
export class SentencesController {
  constructor(private readonly sentences: SentencesService) {}

  @Get("words")
  words() {
    return this.sentences.words();
  }

  @Get()
  list() {
    return this.sentences.list();
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.sentences.get(id);
  }

  @Post()
  create(@Body() body: SentenceDto) {
    return this.sentences.create(body);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: SentenceDto) {
    return this.sentences.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.sentences.remove(id);
  }
}
