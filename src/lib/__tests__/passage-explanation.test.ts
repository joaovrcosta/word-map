import { prisma } from "@/lib/prisma";
import { passageExplanationKey } from "../tutor";
import {
  readPassageExplanation,
  writePassageExplanation,
} from "../passage-explanation";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    wordPassageExplanation: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    word: {
      findFirst: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("passage explanation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("grava e relê a explicação da frase exata", async () => {
    const sentence = "save upon those occasions.";
    mockPrisma.word.findFirst.mockResolvedValue({ id: 9 } as never);
    mockPrisma.wordPassageExplanation.upsert.mockResolvedValue({} as never);
    mockPrisma.wordPassageExplanation.findUnique.mockResolvedValue({
      explanation: "Aqui save significa exceto.",
      translation: "exceto",
    } as never);

    await writePassageExplanation({
      userId: 3,
      span: "Save",
      sentence,
      explanation: "Aqui save significa exceto.",
      translation: "exceto",
      wordId: 9,
    });

    await expect(readPassageExplanation(3, "save", sentence)).resolves.toEqual({
      explanation: "Aqui save significa exceto.",
      translation: "exceto",
    });

    const key = passageExplanationKey("save", sentence);
    expect(mockPrisma.wordPassageExplanation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_passageKey: { userId: 3, passageKey: key } },
        create: expect.objectContaining({ wordId: 9, passageKey: key }),
      })
    );
  });

  it("não devolve a explicação de outra frase", async () => {
    mockPrisma.wordPassageExplanation.findUnique.mockResolvedValue(null);
    await expect(
      readPassageExplanation(3, "save", "Please save the document.")
    ).resolves.toBeNull();
    expect(passageExplanationKey("save", "Please save the document.")).not.toBe(
      passageExplanationKey("save", "save upon those occasions.")
    );
  });

  it("não liga a explicação a uma palavra de outro usuário", async () => {
    mockPrisma.word.findFirst.mockResolvedValue(null);
    mockPrisma.wordPassageExplanation.upsert.mockResolvedValue({} as never);

    await writePassageExplanation({
      userId: 3,
      span: "save",
      sentence: "save upon those occasions.",
      explanation: "exceto",
      wordId: 9,
    });

    expect(mockPrisma.wordPassageExplanation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ wordId: null }),
      })
    );
  });
});
