import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/actions/auth";
import { consumeTutorQuota, refundTutorQuota } from "@/lib/tutor-quota";
import { createOpenAITutor } from "@/lib/tutor";
import { clozeCacheKey } from "@/lib/cloze";

jest.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    init: { body?: string };
    constructor(_url: string, init?: { body?: string }) {
      this.init = init ?? {};
    }
    async json() {
      return JSON.parse(this.init.body || "{}");
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    word: { findMany: jest.fn() },
    wordCloze: { upsert: jest.fn() },
  },
}));

jest.mock("@/actions/auth", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/tutor-quota", () => ({
  consumeTutorQuota: jest.fn(),
  refundTutorQuota: jest.fn(),
}));

jest.mock("@/lib/tutor", () => {
  const actual = jest.requireActual("@/lib/tutor");
  return {
    ...actual,
    createOpenAITutor: jest.fn(),
  };
});

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;
const mockConsume = consumeTutorQuota as jest.MockedFunction<
  typeof consumeTutorQuota
>;
const mockRefund = refundTutorQuota as jest.MockedFunction<
  typeof refundTutorQuota
>;
const mockCreateTutor = createOpenAITutor as jest.MockedFunction<
  typeof createOpenAITutor
>;
const completeJson = jest.fn();

const user = {
  id: 4,
  name: "Ana",
  email: "ana@example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
  role: "USER" as const,
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/flashcards/cloze", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function owned(id: number, name: string, translation = "tradução", cacheKey = "") {
  return {
    id,
    name,
    translations: [translation],
    clozes: cacheKey
      ? [{ cacheKey, sentence: "frase velha", answer: name }]
      : [],
  };
}

describe("POST /api/flashcards/cloze", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(user);
    mockConsume.mockResolvedValue(true);
    mockRefund.mockResolvedValue(undefined);
    completeJson.mockResolvedValue({
      text: JSON.stringify({
        items: [
          { wordId: 1, sentence: "I run home." },
          { wordId: 2, sentence: "She ran home." },
        ],
      }),
      blocked: false,
      truncated: false,
    });
    mockCreateTutor.mockReturnValue({
      explain: jest.fn(),
      completeJson,
    });
    mockPrisma.wordCloze.upsert.mockImplementation(async (args) => args.create as never);
  });

  it("recusa palavra de outro usuário", async () => {
    mockPrisma.word.findMany.mockResolvedValue([owned(1, "run", "correr")] as never);

    const response = await POST(request({ wordIds: [1, 2] }));

    expect(response.status).toBe(403);
    expect(completeJson).not.toHaveBeenCalled();
  });

  it("grava só as frases válidas e usa uma linha por palavra", async () => {
    mockPrisma.word.findMany.mockResolvedValue([
      owned(1, "run", "correr"),
      owned(2, "walk", "andar"),
    ] as never);

    const response = await POST(request({ wordIds: [1, 2] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.wordCloze.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.wordCloze.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { wordId_variant: { wordId: 1, variant: 1 } },
        create: expect.objectContaining({
          answer: "run",
          sentence: "I run home.",
        }),
      })
    );
    expect(body.clozes).toEqual([
      { wordId: 1, sentence: "I run home.", answer: "run" },
    ]);
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it("regenera quando o cacheKey está velho", async () => {
    const freshKey = clozeCacheKey("run", "correr");
    mockPrisma.word.findMany.mockResolvedValue([
      owned(1, "run", "correr", "chave-antiga"),
    ] as never);
    completeJson.mockResolvedValue({
      text: JSON.stringify({
        items: [{ wordId: 1, sentence: "I run daily." }],
      }),
      blocked: false,
      truncated: false,
    });

    const response = await POST(request({ wordIds: [1] }));
    const body = await response.json();

    expect(completeJson).toHaveBeenCalledTimes(1);
    expect(body.clozes[0].sentence).toBe("I run daily.");
    expect(body.clozes[0].sentence).not.toBe("frase velha");
    expect(mockPrisma.wordCloze.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { wordId_variant: { wordId: 1, variant: 1 } },
        update: expect.objectContaining({ cacheKey: freshKey }),
      })
    );
  });

  it("duas gravações simultâneas usam a mesma chave única", async () => {
    mockPrisma.word.findMany.mockResolvedValue([
      owned(1, "run", "correr"),
    ] as never);
    completeJson.mockResolvedValue({
      text: JSON.stringify({
        items: [{ wordId: 1, sentence: "I run home." }],
      }),
      blocked: false,
      truncated: false,
    });

    await Promise.all([
      POST(request({ wordIds: [1] })),
      POST(request({ wordIds: [1] })),
    ]);

    expect(mockPrisma.wordCloze.upsert).toHaveBeenCalledTimes(2);
    for (const call of mockPrisma.wordCloze.upsert.mock.calls) {
      expect(call[0]).toEqual(
        expect.objectContaining({
          where: { wordId_variant: { wordId: 1, variant: 1 } },
        })
      );
    }
  });

  it("descarta json fora do schema sem derrubar a sessão", async () => {
    mockPrisma.word.findMany.mockResolvedValue([
      owned(1, "run", "correr"),
    ] as never);
    completeJson.mockResolvedValue({
      text: '{"nope":true}',
      blocked: false,
      truncated: false,
    });

    const response = await POST(request({ wordIds: [1] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.clozes).toEqual([]);
    expect(mockPrisma.wordCloze.upsert).not.toHaveBeenCalled();
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it("devolve a cota quando a chamada falha por completo", async () => {
    mockPrisma.word.findMany.mockResolvedValue([
      owned(1, "run", "correr"),
    ] as never);
    completeJson.mockRejectedValue(
      Object.assign(new Error("rede"), { name: "TutorUnavailable" })
    );

    const response = await POST(request({ wordIds: [1] }));

    expect(response.status).toBe(200);
    expect(mockRefund).toHaveBeenCalledWith(user.id);
    expect(mockPrisma.wordCloze.upsert).not.toHaveBeenCalled();
  });
});
