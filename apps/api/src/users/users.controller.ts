import { Body, Controller, Get, Put } from "@nestjs/common";
import { TRANSLATION_LANGUAGES } from "@word-map/shared";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from "class-validator";
import { UsersService } from "./users.service";

const TRANSLATION_LANGUAGE_CODES = TRANSLATION_LANGUAGES.map((item) => item.code);

class SettingsDto {
  @IsOptional()
  @IsBoolean()
  useAllVaultsForLinks?: boolean;

  @IsOptional()
  @IsBoolean()
  autoTranslateWordPreview?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(TRANSLATION_LANGUAGE_CODES)
  translationLanguage?: (typeof TRANSLATION_LANGUAGE_CODES)[number];

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? value : Number(value)))
  @IsInt()
  @IsIn([5, 10, 15, 20])
  dailyGoalMinutes?: number;
}

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("settings")
  settings() {
    return this.users.settings();
  }

  @Put("settings")
  updateSettings(@Body() body: SettingsDto) {
    return this.users.updateSettings(body);
  }

  @Get("stats")
  stats() {
    return this.users.stats();
  }
}
