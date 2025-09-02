import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  isAuthenticated,
  generateResetCode,
  verifyResetCode,
  resetPassword,
  type RegisterData,
  type LoginData,
  type User,
} from "../auth";
import { prisma } from "@/lib/prisma";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Mock das dependências
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(),
  generateResetEmailHtml: jest.fn(),
  generateResetEmailText: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockHash = hash as jest.MockedFunction<typeof hash>;
const mockCompare = compare as jest.MockedFunction<typeof compare>;
const mockSign = sign as jest.MockedFunction<typeof sign>;
const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe("Auth Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registerUser", () => {
    const validRegisterData: RegisterData = {
      name: "João Silva",
      email: "joao@example.com",
      password: "password123",
    };

    it("deve registrar um novo usuário com sucesso", async () => {
      const mockUser = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashedPassword",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockHash.mockResolvedValue("hashedPassword");
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await registerUser(validRegisterData);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "joao@example.com" },
      });
      expect(mockHash).toHaveBeenCalledWith("password123", 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "João Silva",
          email: "joao@example.com",
          password: "hashedPassword",
        },
      });
      expect(result).toEqual({
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it("deve falhar se todos os campos não forem fornecidos", async () => {
      const invalidData = { name: "", email: "", password: "" };

      await expect(registerUser(invalidData as RegisterData)).rejects.toThrow(
        "Todos os campos são obrigatórios"
      );
    });

    it("deve falhar se a senha for muito curta", async () => {
      const invalidData = { ...validRegisterData, password: "123" };

      await expect(registerUser(invalidData)).rejects.toThrow(
        "A senha deve ter pelo menos 6 caracteres"
      );
    });

    it("deve falhar se o email já existir", async () => {
      const existingUser = {
        id: 1,
        name: "Usuário Existente",
        email: "joao@example.com",
        password: "hashedPassword",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(registerUser(validRegisterData)).rejects.toThrow(
        "Este email já está em uso"
      );
    });
  });

  describe("loginUser", () => {
    const validLoginData: LoginData = {
      email: "joao@example.com",
      password: "password123",
    };

    it("deve fazer login com sucesso", async () => {
      const mockUser = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashedPassword",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCookieStore = {
        set: jest.fn(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockCompare.mockResolvedValue(true);
      mockSign.mockReturnValue("jwt-token");
      mockCookies.mockResolvedValue(mockCookieStore);

      const result = await loginUser(validLoginData);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "joao@example.com" },
      });
      expect(mockCompare).toHaveBeenCalledWith("password123", "hashedPassword");
      expect(mockSign).toHaveBeenCalledWith(
        {
          userId: 1,
          email: "joao@example.com",
          name: "João Silva",
        },
        "test-secret-key",
        { expiresIn: "7d" }
      );
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        "jwt-token",
        {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60,
        }
      );
      expect(result).toEqual({
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it("deve falhar se email ou senha não forem fornecidos", async () => {
      const invalidData = { email: "", password: "" };

      await expect(loginUser(invalidData as LoginData)).rejects.toThrow(
        "Email e senha são obrigatórios"
      );
    });

    it("deve falhar se o usuário não for encontrado", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(loginUser(validLoginData)).rejects.toThrow(
        "Email ou senha inválidos"
      );
    });

    it("deve falhar se a senha estiver incorreta", async () => {
      const mockUser = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashedPassword",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockCompare.mockResolvedValue(false);

      await expect(loginUser(validLoginData)).rejects.toThrow(
        "Email ou senha inválidos"
      );
    });
  });

  describe("logoutUser", () => {
    it("deve fazer logout com sucesso", async () => {
      const mockCookieStore = {
        delete: jest.fn(),
      };

      mockCookies.mockResolvedValue(mockCookieStore);

      await logoutUser();

      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });
  });

  describe("getCurrentUser", () => {
    it.skip("deve retornar usuário se token for válido", async () => {
      const mockUser = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashedPassword",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: "valid-token" }),
      };

      const mockPayload = {
        userId: 1,
        email: "joao@example.com",
        name: "João Silva",
      };

      mockCookies.mockResolvedValue(mockCookieStore);
      mockJwtVerify.mockResolvedValue({ payload: mockPayload });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await getCurrentUser();

      // Debug: verificar se os mocks foram chamados
      console.log("mockCookies calls:", mockCookies.mock.calls);
      console.log("mockJwtVerify calls:", mockJwtVerify.mock.calls);
      console.log(
        "mockPrisma.user.findUnique calls:",
        mockPrisma.user.findUnique.mock.calls
      );

      expect(result).toEqual({
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it("deve retornar null se não houver token", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(undefined),
      };

      mockCookies.mockResolvedValue(mockCookieStore);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("deve retornar null se token for inválido", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: "invalid-token" }),
      };

      mockCookies.mockResolvedValue(mockCookieStore);
      mockJwtVerify.mockRejectedValue(new Error("Invalid token"));

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe("isAuthenticated", () => {
    it.skip("deve retornar true se usuário estiver autenticado", async () => {
      const mockUser = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashedPassword",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: "valid-token" }),
      };

      const mockPayload = {
        userId: 1,
        email: "joao@example.com",
        name: "João Silva",
      };

      mockCookies.mockResolvedValue(mockCookieStore);
      mockJwtVerify.mockResolvedValue({ payload: mockPayload });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });

    it("deve retornar false se usuário não estiver autenticado", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(undefined),
      };

      mockCookies.mockResolvedValue(mockCookieStore);

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe("generateResetCode", () => {
    it("deve gerar código de reset com sucesso", async () => {
      const mockUser = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashedPassword",
        resetCode: null,
        resetCodeExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { sendEmail } = require("@/lib/email");

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      sendEmail.mockResolvedValue(true);

      const result = await generateResetCode("joao@example.com");

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "joao@example.com" },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: "joao@example.com" },
        data: {
          resetCode: expect.any(String),
          resetCodeExpires: expect.any(Date),
        },
      });
      expect(sendEmail).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("deve falhar se usuário não for encontrado", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await generateResetCode("nonexistent@example.com");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Usuário não encontrado");
    });
  });

  describe("verifyResetCode", () => {
    it("deve verificar código válido com sucesso", async () => {
      const mockUser = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashedPassword",
        resetCode: "123456",
        resetCodeExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos no futuro
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await verifyResetCode("joao@example.com", "123456");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Código válido");
    });

    it("deve falhar se código for inválido", async () => {
      const mockUser = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashedPassword",
        resetCode: "123456",
        resetCodeExpires: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await verifyResetCode("joao@example.com", "654321");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Código inválido");
    });

    it("deve falhar se código estiver expirado", async () => {
      const mockUser = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashedPassword",
        resetCode: "123456",
        resetCodeExpires: new Date(Date.now() - 15 * 60 * 1000), // 15 minutos no passado
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await verifyResetCode("joao@example.com", "123456");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Código expirado");
    });
  });

  describe("resetPassword", () => {
    it("deve resetar senha com sucesso", async () => {
      const mockUser = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashedPassword",
        resetCode: "123456",
        resetCodeExpires: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockHash.mockResolvedValue("newHashedPassword");
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await resetPassword(
        "joao@example.com",
        "123456",
        "newPassword123"
      );

      expect(mockHash).toHaveBeenCalledWith("newPassword123", 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: "joao@example.com" },
        data: {
          password: "newHashedPassword",
          resetCode: null,
          resetCodeExpires: null,
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Senha alterada com sucesso");
    });

    it("deve falhar se código for inválido", async () => {
      const mockUser = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashedPassword",
        resetCode: "123456",
        resetCodeExpires: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await resetPassword(
        "joao@example.com",
        "654321",
        "newPassword123"
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Código inválido");
    });
  });
});
