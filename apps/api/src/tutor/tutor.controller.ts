import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { TutorService } from "./tutor.service";

class PassageQueryDto {
  @IsString()
  span!: string;

  @IsString()
  sentence!: string;
}

class ContextualizeDto {
  @IsOptional()
  span?: unknown;

  @IsOptional()
  sentence?: unknown;

  @IsOptional()
  paragraph?: unknown;

  @IsOptional()
  previousParagraph?: unknown;

  @IsOptional()
  wordId?: unknown;
}

class SuggestDto {
  @IsOptional()
  word?: unknown;

  @IsOptional()
  sentence?: unknown;

  @IsOptional()
  wordId?: unknown;
}

class FollowUpDto {
  @IsOptional()
  span?: unknown;

  @IsOptional()
  sentence?: unknown;

  @IsOptional()
  explanation?: unknown;

  @IsOptional()
  question?: unknown;

  @IsOptional()
  previousTurns?: unknown;
}

@Controller("tutor")
export class TutorController {
  constructor(private readonly tutor: TutorService) {}

  @Get("passages")
  passage(@Query() query: PassageQueryDto) {
    return this.tutor.passage(query.span, query.sentence);
  }

  @Post("contextualize")
  contextualize(@Body() body: ContextualizeDto) {
    return this.tutor.contextualize(body);
  }

  @Post("suggest-translation")
  suggest(@Body() body: SuggestDto) {
    return this.tutor.suggest(body);
  }

  @Post("follow-up")
  followUp(@Body() body: FollowUpDto) {
    return this.tutor.followUp(body);
  }
}
