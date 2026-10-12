import { NextRequest } from "next/server";
import { POST } from "../route";
import { getCurrentUser } from "@/actions/auth";
import { consumeTutorQuota } from "@/lib/tutor-quota";
import { createOpenAITutor } from "@/lib/tutor";
import { requestSessionReview } from "@/lib/flashcard-session-client";

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

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;
const mockConsume = consumeTutorQuota as jest.MockedFunction<
  typeof consumeTutorQuota
>;
const mockCreateTutor = createOpenAITutor as jest.MockedFunction<
  typeof createOpenAITutor
>;

const user = {
  id: 4,
  name: "Ana",
  email: "ana@example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
  role: "USER" as const,
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/flashcards/review", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function items(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    name: `word${index}`,
    translation: "tradução",
    kind: "cloze",
    result: "miss",
  }));
}

describe("POST /api/flashcards/review", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(user);
    mockConsume.mockResolvedValue(true);
    mockCreateTutor.mockReturnValue({
      explain: jest.fn(),
      completeJson: jest.fn().mockResolvedValue({
        text: JSON.stringify({ text: "Treine as palavras que errou." }),
        blocked: false,
        truncated: false,
      }),
    });
  });

  it("recusa 41 itens", async () => {
    const response = await POST(request({ items: items(41) }));
    expect(response.status).toBe(400);
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it("responde 429 quando a cota estoura", async () => {
    mockConsume.mockResolvedValue(false);
    const response = await POST(request({ items: items(1) }));
    expect(response.status).toBe(429);
  });
});

describe("requestSessionReview", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("mantém a sessão quando a análise não vem", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "Muitas explicações em pouco tempo." }),
    }) as unknown as typeof fetch;

    await expect(
      requestSessionReview([
        { name: "run", translation: "correr", kind: "cloze", result: "miss" },
      ])
    ).resolves.toBeNull();
  });
});
