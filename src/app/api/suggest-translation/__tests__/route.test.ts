import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/actions/auth";
import { consumeTutorQuota, refundTutorQuota } from "@/lib/tutor-quota";
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
    word: { findFirst: jest.fn() },
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
  return new NextRequest("http://localhost/api/suggest-translation", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/suggest-translation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(user);
    mockConsume.mockResolvedValue(true);
    mockRefund.mockResolvedValue(undefined);
    completeJson.mockResolvedValue({
      text: '{"translation":"recado"}',
      blocked: false,
      truncated: false,
    });
    mockCreateTutor.mockReturnValue({ completeJson } as never);
  });

  it("responde 401 sem usuário", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const response = await POST(request({ word: "errand" }));
    expect(response.status).toBe(401);
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it("devolve a tradução sugerida", async () => {
    const response = await POST(request({ word: "errand" }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.translation).toBe("recado");
    expect(completeJson).toHaveBeenCalledTimes(1);
  });

  it("recusa a palavra de outro usuário", async () => {
    mockPrisma.word.findFirst.mockResolvedValue(null);
    const response = await POST(request({ word: "errand", wordId: 9 }));
    expect(response.status).toBe(403);
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it("responde 429 sem chamar o modelo quando a cota estoura", async () => {
    mockConsume.mockResolvedValue(false);
    const response = await POST(request({ word: "errand" }));
    expect(response.status).toBe(429);
    expect(completeJson).not.toHaveBeenCalled();
  });

  it("devolve a cota quando o modelo não responde", async () => {
    const unavailable = new Error("fetch failed");
    unavailable.name = "TutorUnavailable";
    completeJson.mockRejectedValueOnce(unavailable);
    const response = await POST(request({ word: "errand" }));
    expect(response.status).toBe(502);
    expect(mockRefund).toHaveBeenCalledWith(user.id);
  });
});
