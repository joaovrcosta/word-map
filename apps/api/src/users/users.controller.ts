import { Body, Controller, Get, Put } from "@nestjs/common";
import { IsBoolean, IsOptional } from "class-validator";
import { UsersService } from "./users.service";

class SettingsDto {
  @IsOptional()
  @IsBoolean()
  useAllVaultsForLinks?: boolean;

  @IsOptional()
  @IsBoolean()
  autoTranslateWordPreview?: boolean;
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
