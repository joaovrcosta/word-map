import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { bindPrisma } from "./client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    bindPrisma(this);
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
