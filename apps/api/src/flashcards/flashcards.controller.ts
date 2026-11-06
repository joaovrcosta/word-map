import { Body, Controller, Get, HttpException, Param, ParseIntPipe, Post } from "@nestjs/common";
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString } from "class-validator";
import { FlashcardsService } from "./flashcards.service";
import type { ChallengeKind, FlashcardWord } from "../domain/flashcards";
import { applyWordLearningPreset } from "../domain/word-fsrs";
import { getCurrentUser } from "../auth/current-user";

class StatusDto {
  @IsIn(["new", "learning", "relearning", "reviewing", "confident"])
  status!: "new" | "learning" | "relearning" | "reviewing" | "confident";
}

class ProgressDto {
  /** Preferred FSRS rating (1 Again … 4 Easy). */
  @IsOptional()
  @IsInt()
  rating?: number;

  /** Legacy alias for rating when `rating` is absent. Ignored if `rating` is set. */
  @IsOptional()
  @IsInt()
  confidence?: number;

  @IsOptional()
  @IsInt()
  reviewCount?: number;

  @IsOptional()
  @IsString()
  reviewedAt?: string;

  @IsOptional()
  @IsString()
  clientReviewId?: string;
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

  @Post("speak-sentences")
  speakSentences(@Body() body: ClozeDto) {
    return this.flashcards.speakSentences(body.wordIds);
  }

  @Post("review")
  review(@Body() body: ReviewDto) {
    return this.flashcards.review(body.items);
  }

  @Post("words/:id/progress")
  progress(@Param("id", ParseIntPipe) id: number, @Body() body: ProgressDto) {
    return this.flashcards.progress(id, {
      rating: body.rating,
      confidence: body.confidence,
      reviewedAt: body.reviewedAt,
      clientReviewId: body.clientReviewId,
    });
  }

  @Post("words/:id/status")
  async status(@Param("id", ParseIntPipe) id: number, @Body() body: StatusDto) {
    const user = await getCurrentUser();
    if (!user) throw new HttpException({ error: "Não autenticado" }, 401);
    try {
      return await applyWordLearningPreset(id, user.id, body.status);
    } catch (error) {
      const statusCode = (error as { statusCode?: number } | null)?.statusCode ?? 500;
      throw new HttpException({ error: error instanceof Error ? error.message : "Erro" }, statusCode);
    }
  }

  @Post("words/:id/result")
  result(@Param("id", ParseIntPipe) id: number, @Body() body: ResultDto) {
    return this.flashcards.result(id, body.correct, body.challenge, body.streak);
  }
}
