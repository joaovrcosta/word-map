import { HttpException, Injectable } from "@nestjs/common";
import { getCurrentUser } from "../auth/current-user";
import { getRankingBoard, isRankingPeriod } from "../lib/points";

@Injectable()
export class RankingService {
  async board(period: string | undefined) {
    const user = await getCurrentUser();
    if (!user) {
      throw new HttpException({ error: "Não autorizado" }, 401);
    }

    const selected = period && period.length > 0 ? period : "lifetime";
    if (!isRankingPeriod(selected)) {
      throw new HttpException({ error: "Período inválido" }, 400);
    }

    return getRankingBoard(user.id, selected);
  }
}
