import { Controller, Get, Query } from "@nestjs/common";
import { RankingService } from "./ranking.service";

@Controller("ranking")
export class RankingController {
  constructor(private readonly ranking: RankingService) {}

  @Get()
  board(@Query("period") period?: string) {
    return this.ranking.board(period);
  }
}
