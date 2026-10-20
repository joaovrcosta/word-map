export type RankingPeriod = "week" | "month" | "lifetime";

export type RankingEntry = {
  rank: number;
  userId: number;
  name: string;
  points: number;
  isMe: boolean;
};

export type RankingBoard = {
  period: RankingPeriod;
  pointsPerWord: number;
  pointsPerChallenge: number;
  me: { points: number; rank: number | null };
  entries: RankingEntry[];
};
