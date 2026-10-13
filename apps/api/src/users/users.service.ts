import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  getUserSettings,
  getUserStats,
  upsertUserSettings,
  type UserSettingsUpdate,
} from "../domain/user-settings";

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSettings(userId: number) {
    return this.prisma.userSettings.findUnique({ where: { userId } });
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  settings() {
    return getUserSettings();
  }

  updateSettings(updates: UserSettingsUpdate) {
    return upsertUserSettings(updates);
  }

  stats() {
    return getUserStats();
  }
}
