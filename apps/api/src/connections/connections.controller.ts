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
import { IsArray, IsIn, IsOptional, IsString } from "class-validator";
import { ConnectionsService } from "./connections.service";

class ConnectionWordDto {
  wordId!: number;
  @IsOptional()
  @IsString()
  title?: string;
  @IsOptional()
  @IsString()
  description?: string;
}

class ConnectionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(["semantic", "grammatical", "contextual", "opposite", "similar"])
  connectionType!:
    | "semantic"
    | "grammatical"
    | "contextual"
    | "opposite"
    | "similar";

  @IsArray()
  words!: ConnectionWordDto[];
}

@Controller("connections")
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get()
  list() {
    return this.connections.list();
  }

  @Post()
  create(@Body() body: ConnectionDto) {
    return this.connections.create(body);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: ConnectionDto) {
    return this.connections.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.connections.remove(id);
  }
}
