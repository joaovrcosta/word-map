import { prisma } from "../../prisma/client";
import { getCurrentUser } from "../../auth/current-user";
import { getReadingProgress, saveReadingProgress } from "../books";
import { chapterContentRevision } from "@word-map/shared/reading-pages";

jest.mock("../../prisma/client", () => ({
  prisma: {
    chapter: { findUnique: jest.fn() },
    book: { findUnique: jest.fn() },
    userLibrary: { findUnique: jest.fn() },
    readingProgress: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("../../auth/current-user", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("../../common/revalidate", () => ({
  revalidatePath: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;

const user = {
  id: 1,
  name: "Ana",
  email: "ana@example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
  role: "USER" as const,
};

function chapterContent() {
  const paragraph = (label: string) =>
    Array.from(
      { length: 16 },
      (_, index) =>
        `${label} sentence ${index} talks about the moor and the hound tonight.`
    ).join(" ");
  return [paragraph("Alpha"), paragraph("Beta"), paragraph("Gamma")].join(
    "\n\n"
  );
}

function ownedBook() {
  return {
    id: 3,
    title: "Baskervilles",
    description: null,
    isOfficial: false,
    ownerId: user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    chapters: [],
    _count: { chapters: 1 },
  };
}

describe("reading progress", () => {
  const content = chapterContent();
  const revision = chapterContentRevision(content);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(user);
    mockPrisma.chapter.findUnique.mockResolvedValue({
      id: 8,
      bookId: 3,
      title: "Capítulo 1",
      content,
      order: 0,
      contentLength: revision.contentLength,
      contentHash: revision.contentHash,
      normalizationVersion: revision.normalizationVersion,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    mockPrisma.book.findUnique.mockResolvedValue(ownedBook() as never);
    mockPrisma.readingProgress.findUnique.mockResolvedValue(null);
    mockPrisma.readingProgress.upsert.mockImplementation(
      async (args: {
        create: {
          pageIndex: number;
          paragraphIndex: number;
          contentOffset: number | null;
          reachedEndAt: Date | null;
        };
      }) => args.create as never
    );
  });

  it("grava e relê pageIndex/paragraphIndex/contentOffset", async () => {
    mockPrisma.readingProgress.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 1,
        userId: user.id,
        chapterId: 8,
        pageIndex: 6,
        paragraphIndex: 2,
        contentOffset: 420,
        reachedEndAt: null,
        updatedAt: new Date(),
      } as never);

    const saved = await saveReadingProgress(8, {
      pageIndex: 6,
      paragraphIndex: 2,
      contentOffset: 420,
      contentRevision: revision,
    });
    const loaded = await getReadingProgress(8);

    expect(saved.pageIndex).toBe(6);
    expect(saved.paragraphIndex).toBe(2);
    expect(saved.contentOffset).toBe(420);
    expect(saved.contentRevision).toEqual(revision);
    expect(loaded).toEqual(
      expect.objectContaining({
        pageIndex: 6,
        paragraphIndex: 2,
        contentOffset: 420,
        contentRevision: revision,
      })
    );
    expect(mockPrisma.readingProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          pageIndex: 6,
          paragraphIndex: 2,
          contentOffset: 420,
        }),
        update: expect.objectContaining({
          pageIndex: 6,
          paragraphIndex: 2,
          contentOffset: 420,
        }),
      })
    );
  });

  it("PUT sem contentOffset zera o offset (app antigo)", async () => {
    await saveReadingProgress(8, { pageIndex: 3, paragraphIndex: 1 });
    expect(mockPrisma.readingProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ contentOffset: null }),
        update: expect.objectContaining({ contentOffset: null }),
      })
    );
  });

  it("última página marca reachedEndAt e não limpa ao voltar", async () => {
    const endAt = new Date("2026-01-01T00:00:00.000Z");
    mockPrisma.readingProgress.findUnique.mockResolvedValue({
      reachedEndAt: endAt,
    } as never);

    const saved = await saveReadingProgress(8, {
      pageIndex: 1,
      paragraphIndex: 0,
      contentOffset: 10,
      contentRevision: revision,
    });

    expect(saved.reachedEndAt).toEqual(endAt);
    expect(mockPrisma.readingProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.not.objectContaining({ reachedEndAt: expect.anything() }),
      })
    );
  });

  it("não remapeia progresso salvo com paginação diferente da do cliente", async () => {
    mockPrisma.readingProgress.findUnique.mockResolvedValue({
      id: 1,
      userId: user.id,
      chapterId: 8,
      pageIndex: 6,
      paragraphIndex: 1,
      contentOffset: null,
      reachedEndAt: null,
      updatedAt: new Date(),
    } as never);

    await expect(getReadingProgress(8)).resolves.toEqual(
      expect.objectContaining({
        pageIndex: 6,
        paragraphIndex: 1,
        contentOffset: null,
      })
    );
  });

  it("não grava quando o capítulo está fora de acesso", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      ...ownedBook(),
      ownerId: 99,
      isOfficial: false,
    } as never);

    await expect(
      saveReadingProgress(8, { pageIndex: 0, paragraphIndex: 0 })
    ).rejects.toThrow("Livro não encontrado");
    expect(mockPrisma.readingProgress.upsert).not.toHaveBeenCalled();
  });

  it("normaliza índices negativos ao gravar", async () => {
    const saved = await saveReadingProgress(8, {
      pageIndex: -2,
      paragraphIndex: -1,
      contentOffset: -5,
    });
    expect(saved).toEqual(
      expect.objectContaining({
        pageIndex: 0,
        paragraphIndex: 0,
        contentOffset: 0,
      })
    );
  });
});
