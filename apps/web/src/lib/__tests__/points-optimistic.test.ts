import { bumpRankingBoard, savedImportCount } from "../points-optimistic";

const board = {
  pointsPerWord: 10,
  me: { points: 30, rank: 2 },
  entries: [
    {
      rank: 1,
      userId: 1,
      name: "Ana",
      points: 40,
      isMe: false,
    },
    {
      rank: 2,
      userId: 2,
      name: "Bia",
      points: 30,
      isMe: true,
    },
  ],
};

describe("bumpRankingBoard", () => {
  it("sobe os pontos e a posição na hora", () => {
    const next = bumpRankingBoard(board, 20);
    expect(next.me).toEqual({ points: 50, rank: 1 });
    expect(next.entries.map((entry) => [entry.name, entry.points, entry.rank])).toEqual([
      ["Bia", 50, 1],
      ["Ana", 40, 2],
    ]);
  });

  it("não deixa os pontos ficarem negativos", () => {
    const next = bumpRankingBoard(board, -100);
    expect(next.me.points).toBe(0);
    expect(next.me.rank).toBeNull();
  });
});

describe("savedImportCount", () => {
  it("conta só as palavras marcadas como salvas", () => {
    const raw = JSON.stringify({
      words: [{ isSaved: true }, { isSaved: false }, {}],
    });
    expect(savedImportCount(raw)).toBe(1);
    expect(savedImportCount("não é json")).toBe(0);
  });
});
