import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/actions/auth";
import { consumeTutorQuota } from "@/lib/tutor-quota";
import { createOpenAITutor } from "@/lib/tutor";

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
    readingExplanation: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/actions/auth", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/tutor-quota", () => ({
  consumeTutorQuota: jest.fn(),
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
const mockCreateTutor = createOpenAITutor as jest.MockedFunction<
  typeof createOpenAITutor
>;
const explain = jest.fn();

const user = {
  id: 4,
  name: "Ana",
  email: "ana@example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
  role: "USER" as const,
};

const payload = {
  span: "save",
  sentence: "save upon those occasions.",
  paragraph: "Mr. Holmes was late, save upon those occasions.",
};

function request(body: unknown = payload) {
  return new NextRequest("http://localhost/api/contextualize", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/contextualize", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(user);
    mockPrisma.readingExplanation.findUnique.mockResolvedValue(null);
    mockPrisma.readingExplanation.upsert.mockImplementation(
      async (args: { create: { explanation: string; cacheKey: string } }) =>
        ({
          explanation: args.create.explanation,
          cacheKey: args.create.cacheKey,
        }) as never
    );
    mockConsume.mockResolvedValue(true);
    explain.mockResolvedValue({
      text: "Aqui save significa exceto.",
      blocked: false,
    });
    mockCreateTutor.mockReturnValue({ explain });
  });

  it("responde 401 sem usuário", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it("responde 400 sem span", async () => {
    const response = await POST(request({ sentence: "x", paragraph: "y" }));
    expect(response.status).toBe(400);
    expect(explain).not.toHaveBeenCalled();
  });

  it("não chama o modelo nem a cota quando o cache acerta", async () => {
    mockPrisma.readingExplanation.findUnique.mockResolvedValue({
      id: 1,
      cacheKey: "abc",
      promptVersion: "1",
      model: "gpt-4o-mini",
      explanation: "Significa exceto.",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await POST(request());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.explanation).toBe("Significa exceto.");
    expect(explain).not.toHaveBeenCalled();
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it("chama o modelo uma vez, faz upsert e conta na cota", async () => {
    const response = await POST(request());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.explanation).toBe("Aqui save significa exceto.");
    expect(explain).toHaveBeenCalledTimes(1);
    expect(mockConsume).toHaveBeenCalledWith(user.id);
    expect(mockPrisma.readingExplanation.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.readingExplanation.create).not.toHaveBeenCalled();
  });

  it("usa upsert na mesma chave quando duas gravações correm juntas", async () => {
    const [first, second] = await Promise.all([POST(request()), POST(request())]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const keys = mockPrisma.readingExplanation.upsert.mock.calls.map(
      (call) => call[0].where.cacheKey
    );
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    expect(mockPrisma.readingExplanation.create).not.toHaveBeenCalled();
  });

  it("tenta de novo quando a primeira ligação com o modelo falha", async () => {
    const unavailable = new Error("fetch failed");
    unavailable.name = "TutorUnavailable";
    explain
      .mockRejectedValueOnce(unavailable)
      .mockResolvedValueOnce({
        text: "Aqui save significa exceto.",
        blocked: false,
        truncated: false,
      });

    const response = await POST(request());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.explanation).toBe("Aqui save significa exceto.");
    expect(explain).toHaveBeenCalledTimes(2);
  });

  it("responde 429 sem chamar o modelo quando a cota estoura", async () => {
    mockConsume.mockResolvedValue(false);
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(explain).not.toHaveBeenCalled();
    expect(mockPrisma.readingExplanation.upsert).not.toHaveBeenCalled();
  });

  it("não grava resposta vazia nem bloqueada", async () => {
    explain.mockResolvedValueOnce({ text: "", blocked: false });
    const empty = await POST(request());
    expect(empty.status).toBe(502);

    explain.mockResolvedValueOnce({ text: "bloqueado", blocked: true });
    const blocked = await POST(request());
    expect(blocked.status).toBe(502);
    expect(mockPrisma.readingExplanation.upsert).not.toHaveBeenCalled();
  });
});
