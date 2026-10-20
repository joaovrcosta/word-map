import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from "class-validator";
import { WordsService } from "./words.service";
import type { CreateWordData } from "../domain/actions";
import type { SelectionSaveType } from "../domain/actions";
import type { WordOriginKind } from "@word-map/shared/word-origin";

class CreateWordDto {
  @IsString()
  name!: string;

  @IsString()
  grammaticalClass!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsArray()
  translations!: string[];

  @IsOptional()
  notes?: string | null;

  @IsInt()
  confidence!: number;

  @IsInt()
  vaultId!: number;

  @IsOptional()
  @IsBoolean()
  isSaved?: boolean;

  @IsOptional()
  origin?: CreateWordData["origin"];
}

class UpdateWordDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  grammaticalClass?: string;

  @IsOptional()
  category?: string | null;

  @IsOptional()
  @IsArray()
  translations?: string[];

  @IsOptional()
  notes?: string | null;

  @IsOptional()
  @IsInt()
  confidence?: number;

  @IsOptional()
  origin?: CreateWordData["origin"];
}

class LinkWordsDto {
  @IsInt()
  wordId1!: number;

  @IsInt()
  wordId2!: number;
}

class RemoveFromVaultDto {
  @IsString()
  wordName!: string;

  @IsInt()
  vaultId!: number;

  @IsOptional()
  @IsInt()
  wordId?: number;
}

class MoveWordDto {
  @IsInt()
  vaultId!: number;
}

class TextDto {
  @IsString()
  content!: string;
}

class SelectionDto {
  @IsString()
  selectedText!: string;

  @IsString()
  saveType!: SelectionSaveType;
}

class RecordOriginDto {
  @IsOptional()
  @IsInt()
  wordId?: number;

  @IsString()
  wordName!: string;

  @IsOptional()
  @IsInt()
  vaultId?: number;

  @IsString()
  meaning!: string;

  @IsOptional()
  sentence?: string | null;

  @IsOptional()
  sourceTitle?: string | null;

  @IsOptional()
  sourceKind?: WordOriginKind;
}

@Controller("words")
export class WordsController {
  constructor(private readonly words: WordsService) {}

  @Get("search")
  search(@Query("q") q = "") {
    return this.words.search(q);
  }

  @Get("by-book")
  savedInBook(@Query("title") title = "") {
    return this.words.savedInBook(title);
  }

  @Get("exists")
  exists(
    @Query("name") name = "",
    @Query("vaultId", ParseIntPipe) vaultId: number
  ) {
    return this.words.exists(name, vaultId);
  }

  @Get("relations")
  relations() {
    return this.words.relations();
  }

  @Get("linkable")
  linkable(
    @Query("wordId", ParseIntPipe) wordId: number,
    @Query("vaultId") vaultId?: string,
    @Query("useAllVaults") useAllVaults?: string
  ) {
    return this.words.linkable(
      wordId,
      vaultId ? Number(vaultId) : undefined,
      useAllVaults === "true"
    );
  }

  @Post("link")
  link(@Body() body: LinkWordsDto) {
    return this.words.link(body.wordId1, body.wordId2);
  }

  @Post("unlink")
  unlink(@Body() body: LinkWordsDto) {
    return this.words.unlink(body.wordId1, body.wordId2);
  }

  @Post("check-text")
  checkText(@Body() body: TextDto) {
    return this.words.checkText(body.content);
  }

  @Post("resolve-selection")
  resolveSelection(@Body() body: SelectionDto) {
    return this.words.resolveSelection(body.selectedText, body.saveType);
  }

  @Post("preview-phrasal")
  previewPhrasal(@Body() body: TextDto) {
    return this.words.previewPhrasal(body.content);
  }

  @Post("remove-from-vault")
  removeFromVault(@Body() body: RemoveFromVaultDto) {
    return this.words.removeFromVault(body.wordName, body.vaultId, body.wordId);
  }

  @Post()
  create(@Body() body: CreateWordDto) {
    return this.words.create(body);
  }

  @Get(":id/related")
  related(@Param("id", ParseIntPipe) id: number) {
    return this.words.related(id);
  }

  @Get(":id/origins")
  origins(@Param("id", ParseIntPipe) id: number) {
    return this.words.origins(id);
  }

  @Get(":id/levels")
  levels(@Param("id", ParseIntPipe) id: number) {
    return this.words.levels(id);
  }

  @Post(":id/origins")
  recordOrigin(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: RecordOriginDto
  ) {
    return this.words.recordOrigin({ ...body, wordId: body.wordId ?? id });
  }

  @Post(":id/move")
  move(@Param("id", ParseIntPipe) id: number, @Body() body: MoveWordDto) {
    return this.words.move(id, body.vaultId);
  }

  @Post(":id/unsave")
  unsave(@Param("id", ParseIntPipe) id: number) {
    return this.words.unsave(id);
  }

  @Post(":id/frequency")
  frequency(@Param("id", ParseIntPipe) id: number) {
    return this.words.incrementFrequency(id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateWordDto) {
    return this.words.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.words.remove(id);
  }
}
