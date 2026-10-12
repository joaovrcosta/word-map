import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "../auth";
import { getReadingProgress, saveReadingProgress } from "../books";
import { normalizeReadingPosition, paginateReading } from "@/lib/reading-pages";

jest.mock("@/lib/prisma", () => ({
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

jest.mock("../auth", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("next/cache", () => ({
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(user);
    mockPrisma.chapter.findUnique.mockResolvedValue({
      id: 8,
      bookId: 3,
      title: "Capítulo 1",
      content,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    mockPrisma.book.findUnique.mockResolvedValue(ownedBook() as never);
    mockPrisma.readingProgress.upsert.mockImplementation(
      async (args: { create: { pageIndex: number; paragraphIndex: number } }) =>
        args.create as never
    );
  });

  it("grava e relê o paragraphIndex sem duplicar a linha", async () => {
    const pages = paginateReading(content);
    const target = pages.findIndex((page) =>
      page.slices.some((slice) => slice.paragraphIndex === 2)
    );
    const position = normalizeReadingPosition(pages, 2, target);
    mockPrisma.readingProgress.findUnique.mockResolvedValue({
      id: 1,
      userId: user.id,
      chapterId: 8,
      pageIndex: position.pageIndex,
      paragraphIndex: position.paragraphIndex,
      updatedAt: new Date(),
    } as never);

    const saved = await saveReadingProgress(8, target, 2);
    await saveReadingProgress(8, target, 2);
    const loaded = await getReadingProgress(8);

    expect(saved).toEqual(position);
    expect(loaded).toEqual(position);
    expect(mockPrisma.readingProgress.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.readingProgress.create).not.toHaveBeenCalled();
    expect(mockPrisma.readingProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_chapterId: { userId: user.id, chapterId: 8 } },
      })
    );
  });

  it("reabre pela página do parágrafo quando o pageIndex está defasado", async () => {
    const pages = paginateReading(content);
    const target = pages.findIndex((page) =>
      page.slices.some((slice) => slice.paragraphIndex === 2)
    );
    expect(target).toBeGreaterThan(0);
    mockPrisma.readingProgress.findUnique.mockResolvedValue({
      id: 1,
      userId: user.id,
      chapterId: 8,
      pageIndex: 0,
      paragraphIndex: 2,
      updatedAt: new Date(),
    } as never);

    await expect(getReadingProgress(8)).resolves.toEqual({
      pageIndex: target,
      paragraphIndex: pages[target].slices[0].paragraphIndex,
    });
  });

  it("não grava quando o capítulo está fora de acesso", async () => {
    mockPrisma.book.findUnique.mockResolvedValue({
      ...ownedBook(),
      ownerId: 99,
      isOfficial: false,
    } as never);

    await expect(saveReadingProgress(8, 0, 0)).rejects.toThrow(
      "Livro não encontrado"
    );
    expect(mockPrisma.readingProgress.upsert).not.toHaveBeenCalled();
  });

  it("cai na última página quando o parágrafo não existe mais", async () => {
    const pages = paginateReading(content);
    mockPrisma.readingProgress.findUnique.mockResolvedValue({
      id: 1,
      userId: user.id,
      chapterId: 8,
      pageIndex: 0,
      paragraphIndex: 99,
      updatedAt: new Date(),
    } as never);

    await expect(getReadingProgress(8)).resolves.toEqual({
      pageIndex: pages.length - 1,
      paragraphIndex: pages[pages.length - 1].slices[0].paragraphIndex,
    });
  });
});
