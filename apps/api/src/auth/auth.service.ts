import { Injectable } from "@nestjs/common";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { jwtVerify } from "jose";
import { prisma } from "../prisma/client";
import {
  sendEmail,
  generateResetEmailHtml,
  generateResetEmailText,
} from "../lib/email";
import { publicErrorMessage } from "../lib/public-error";
import type { User, UserRole } from "./current-user";

export type AuthActionResult =
  | { success: true; user: User; token?: string }
  | { success: false; error: string };

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.toLowerCase());
}

function toPublicUser(user: {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  role?: UserRole | null;
}): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: user.role === "ADMIN" ? "ADMIN" : "USER",
  };
}

async function ensureAdminRole(user: {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  role?: UserRole | null;
}) {
  if (!isAdminEmail(user.email) || user.role === "ADMIN") {
    return user;
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });
}

export async function registerUser(
  data: RegisterData
): Promise<AuthActionResult> {
  try {
    if (!data.name || !data.email || !data.password) {
      return { success: false, error: "Todos os campos são obrigatórios" };
    }

    if (data.password.length < 6) {
      return {
        success: false,
        error: "A senha deve ter pelo menos 6 caracteres",
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return { success: false, error: "Este email já está em uso" };
    }

    const hashedPassword = await hash(data.password, 12);
    const email = data.email.toLowerCase().trim();
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        password: hashedPassword,
        role: isAdminEmail(email) ? "ADMIN" : "USER",
      },
    });

    return { success: true, user: toPublicUser(user) };
  } catch (error) {
    return {
      success: false,
      error: publicErrorMessage(
        error,
        "Não foi possível criar a conta. Tente novamente em instantes."
      ),
    };
  }
}

export async function loginUser(data: LoginData): Promise<AuthActionResult> {
  try {
    if (!data.email || !data.password) {
      return { success: false, error: "Email e senha são obrigatórios" };
    }

    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      return { success: false, error: "Email ou senha inválidos" };
    }

    const isPasswordValid = await compare(data.password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: "Email ou senha inválidos" };
    }

    const currentUser = await ensureAdminRole(user);
    const token = sign(
      {
        userId: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return { success: true, user: toPublicUser(currentUser), token };
  } catch (error) {
    return {
      success: false,
      error: publicErrorMessage(
        error,
        "Não foi possível entrar. Tente novamente em instantes."
      ),
    };
  }
}

export async function userFromToken(token: string): Promise<User | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (!payload || typeof payload.userId !== "number") return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) return null;

    const currentUser = await ensureAdminRole(user);
    return toPublicUser(currentUser);
  } catch {
    return null;
  }
}

export async function generateResetCode(email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: false, message: "Usuário não encontrado" };
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.user.update({
      where: { email },
      data: {
        resetCode,
        resetCodeExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const emailSent = await sendEmail({
      from: "noreply@wordmap.com",
      to: email,
      subject: "Reset de Senha - Word Map",
      html: generateResetEmailHtml(email, resetCode),
      text: generateResetEmailText(email, resetCode),
    });

    if (!emailSent) {
      return { success: false, message: "Erro ao enviar email" };
    }

    return { success: true, message: "Código de reset enviado para seu email" };
  } catch {
    return { success: false, message: "Erro interno do servidor" };
  }
}

export async function verifyResetCode(email: string, code: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: false, message: "Usuário não encontrado" };
    }
    if (!user.resetCode || !user.resetCodeExpires) {
      return { success: false, message: "Código de reset não solicitado" };
    }
    if (user.resetCode !== code) {
      return { success: false, message: "Código inválido" };
    }
    if (new Date() > user.resetCodeExpires) {
      return { success: false, message: "Código expirado" };
    }
    return { success: true, message: "Código válido" };
  } catch {
    return { success: false, message: "Erro interno do servidor" };
  }
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
) {
  try {
    const codeVerification = await verifyResetCode(email, code);
    if (!codeVerification.success) return codeVerification;

    const hashedPassword = await hash(newPassword, 12);
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpires: null,
      },
    });

    return { success: true, message: "Senha alterada com sucesso" };
  } catch {
    return { success: false, message: "Erro interno do servidor" };
  }
}

@Injectable()
export class AuthService {
  register(data: RegisterData) {
    return registerUser(data);
  }

  login(data: LoginData) {
    return loginUser(data);
  }

  userFromToken(token: string) {
    return userFromToken(token);
  }

  generateResetCode(email: string) {
    return generateResetCode(email);
  }

  verifyResetCode(email: string, code: string) {
    return verifyResetCode(email, code);
  }

  resetPassword(email: string, code: string, newPassword: string) {
    return resetPassword(email, code, newPassword);
  }
}
