import { Body, Controller, Get, Put } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional } from "class-validator";
import { UsersService } from "./users.service";

class SettingsDto {
  @IsOptional()
  @IsBoolean()
  useAllVaultsForLinks?: boolean;

  @IsOptional()
  @IsBoolean()
  autoTranslateWordPreview?: boolean;

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
