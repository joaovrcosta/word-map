import { paintSpokenWord, timedWords, wordAtChar, wordAtElapsed } from "../spoken-word";

describe("spoken word", () => {
  it("avança de palavra conforme o tempo da frase", () => {
    const words = timedWords("Once upon a time.");
    expect(words.map((word) => word.start)).toEqual([0, 5, 10, 12]);
    expect(wordAtElapsed(words, 0)?.start).toBe(0);
    const afterFirst = words[0].ms + 1;
    expect(wordAtElapsed(words, afterFirst)?.start).toBe(5);
    expect(wordAtChar(words, 6)?.start).toBe(5);
  });

  it("pinta só a palavra falada", () => {
    document.body.innerHTML = `
      <div id="root">
        <span data-word-start="0" data-word-end="4">Once</span>
        <span data-word-start="5" data-word-end="9">upon</span>
      </div>
    `;
    const root = document.getElementById("root")!;
    paintSpokenWord(root, { start: 5, end: 9 });
    expect(root.querySelectorAll(".spoken-word")).toHaveLength(1);
    expect(root.querySelector(".spoken-word")?.textContent).toBe("upon");
    paintSpokenWord(root, null);
    expect(root.querySelectorAll(".spoken-word")).toHaveLength(0);
  });
});
