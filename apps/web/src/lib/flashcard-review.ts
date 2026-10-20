export const REVIEW_ITEM_LIMIT = 40;

export type ReviewItem = {
  id: number;
  kind: "recall" | "cloze" | "listen" | "match";
  result: string;
  typed?: string;
};
