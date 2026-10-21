export type UserStats = {
  totalWords: number;
  totalVaults: number;
  wordsByConfidence: Array<{ confidence: number; count: number }>;
  wordsByCategory: Array<{ category: string; count: number }>;
  wordsByGrammaticalClass: Array<{ grammaticalClass: string; count: number }>;
  recentActivity: number;
  totalConnections: number;
};
