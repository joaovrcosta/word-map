import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsOptional } from "class-validator";
import {
  answerStoryStep,
  completeStory,
  getPublishedStory,
  listPublishedStories,
  startStory,
} from "../domain/stories";

function toOptionalBoolean(value: unknown) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return value;
}

class AnswerDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  value?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value.map((item) => Number(item)) : value))
  optionIds?: number[];
}

@Controller("stories")
export class StoriesController {
  @Get()
  list() {
    return listPublishedStories();
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return getPublishedStory(id);
  }

  @Post(":id/start")
  start(@Param("id", ParseIntPipe) id: number) {
    return startStory(id);
  }

  @Post(":id/complete")
  complete(@Param("id", ParseIntPipe) id: number) {
    return completeStory(id);
  }

  @Post(":id/steps/:stepId/answer")
  answer(
    @Param("id", ParseIntPipe) id: number,
    @Param("stepId", ParseIntPipe) stepId: number,
    @Body() body: AnswerDto
  ) {
    return answerStoryStep(id, stepId, {
      value: typeof body.value === "boolean" ? body.value : undefined,
      optionIds: Array.isArray(body.optionIds) ? body.optionIds : undefined,
    });
  }
}
