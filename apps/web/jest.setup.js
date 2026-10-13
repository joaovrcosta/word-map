import "@testing-library/jest-dom";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/";
  },
}));

// Mock Next.js cookies - removido para evitar conflitos com testes específicos

// Mock Next.js cache
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

// Mock environment variables
process.env.JWT_SECRET = "test-secret-key";
process.env.NODE_ENV = "test";

// Mock fetch globally
global.fetch = jest.fn();

// Mock Request global for Next.js API routes
global.Request = class Request {
  constructor(url, init) {
    Object.defineProperty(this, "url", { value: url, writable: false });
    this.init = init;
  }
  async json() {
    return JSON.parse(this.init?.body || "{}");
  }
  async text() {
    return this.init?.body || "";
  }
};

// Mock Response global for Next.js API routes
global.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || "OK";
    this.ok = this.status >= 200 && this.status < 300;
  }
  async json() {
    return JSON.parse(this.body);
  }
  async text() {
    return this.body;
  }
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
