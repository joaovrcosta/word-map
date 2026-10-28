import { sameIdSet } from "../story-answer";

describe("sameIdSet", () => {
  it("aceita o conjunto certo em qualquer ordem", () => {
    expect(sameIdSet([3, 1], [1, 3])).toBe(true);
  });

  it("recusa opção a mais, a menos ou diferente", () => {
    expect(sameIdSet([1, 3, 4], [1, 3])).toBe(false);
    expect(sameIdSet([1], [1, 3])).toBe(false);
    expect(sameIdSet([2], [1])).toBe(false);
  });
});
