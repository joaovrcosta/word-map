import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional } from "class-validator";
import { FlashcardsService } from "./flashcards.service";
import type { ChallengeKind, FlashcardWord } from "../domain/flashcards";

class ProgressDto {
  @IsInt()
  confidence!: number;

  @IsInt()
  reviewCount!: number;
}

class ResultDto {
  @IsBoolean()
  correct!: boolean;

  @IsIn(["listen", "match", "cloze", "speak"])
  challenge!: ChallengeKind;

  @IsOptional()
  @IsInt()
  streak?: number;
}

class ScheduleDto {
  @IsInt()
  currentConfidence!: number;

  @IsInt()
  reviewCount!: number;

  @IsOptional()
  @IsNumber()
  easeFactor?: number;
}

class FilterDto {
  @IsArray()
  words!: FlashcardWord[];
}

class ClozeDto {
  @IsArray()
  wordIds!: number[];
}

class ReviewDto {
  @IsArray()
  items!: unknown[];
}

class SessionDto {
  @IsInt()
  vaultId!: number;
}

@Controller("flashcards")
export class FlashcardsController {
  constructor(private readonly flashcards: FlashcardsService) {}

  @Get("words")
  allWords() {
    return this.flashcards.allWords();
  }

  @Get("vaults/:id/words")
  words(@Param("id", ParseIntPipe) id: number) {
    return this.flashcards.words(id);
  }

  @Get("vaults/:id")
  vault(@Param("id", ParseIntPipe) id: number) {
    return this.flashcards.vault(id);
  }

  @Post("sessions")
  session(@Body() body: SessionDto) {
    return this.flashcards.session(body.vaultId);
  }

  @Post("schedule")
  schedule(@Body() body: ScheduleDto) {
    return this.flashcards.nextReview(
      body.currentConfidence,
      body.reviewCount,
      body.easeFactor
    );
  }

  @Post("filter")
  filter(@Body() body: FilterDto) {
    return this.flashcards.filter(body.words);
  }

  @Post("cloze")
  cloze(@Body() body: ClozeDto) {
    return this.flashcards.clozes(body.wordIds);
  }

  @Post("review")
  review(@Body() body: ReviewDto) {
    return this.flashcards.review(body.items);
  }

  @Post("words/:id/progress")
  progress(@Param("id", ParseIntPipe) id: number, @Body() body: ProgressDto) {
    return this.flashcards.progress(id, body.confidence, body.reviewCount);
  }

  @Post("words/:id/result")
  result(@Param("id", ParseIntPipe) id: number, @Body() body: ResultDto) {
    return this.flashcards.result(id, body.correct, body.challenge, body.streak);
  }
}
