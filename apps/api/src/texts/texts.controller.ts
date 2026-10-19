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
import { IsString } from "class-validator";
import { TextsService } from "./texts.service";

class TextBodyDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;
}

@Controller("texts")
export class TextsController {
  constructor(private readonly texts: TextsService) {}

  @Get()
  list() {
    return this.texts.list();
  }

  @Get("catalog")
  catalog() {
    return this.texts.catalog();
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.texts.get(id);
  }

  @Post()
  create(@Body() body: TextBodyDto) {
    return this.texts.create(body.title, body.content);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: TextBodyDto) {
    return this.texts.update(id, body.title, body.content);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.texts.remove(id);
  }
}
