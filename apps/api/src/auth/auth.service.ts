import { Injectable } from "@nestjs/common";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { jwtVerify } from "jose";
import { OAuth2Client } from "google-auth-library";
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
  | { success: false; error: string }
  | {
      success: false;
      needsUsername: true;
      email: string;
      name: string;
    };

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  username: string;
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const DEFAULT_VAULT_NAME = "Meu dicionario";

export function normalizeUsername(value: string): string | null {
  const username = value.trim().replace(/^@+/, "").toLowerCase();
  if (!USERNAME_PATTERN.test(username)) return null;
  return username;
}

async function ensureDefaultVault(userId: number) {
  const existing = await prisma.vault.count({ where: { userId } });
  if (existing > 0) return;
  await prisma.vault.create({
    data: {
      name: DEFAULT_VAULT_NAME,
      userId,
    },
  });
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

function moderatorEmails(): string[] {
  return (process.env.MODERATOR_EMAIL || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isModeratorEmail(email: string): boolean {
  return moderatorEmails().includes(email.toLowerCase());
}

function publicRole(role?: UserRole | null): UserRole {
  if (role === "ADMIN" || role === "MODERATOR") return role;
  return "USER";
}

function toPublicUser(user: {
  id: number;
  name: string;
  email: string;
  username?: string | null;
  createdAt: Date;
  updatedAt: Date;
  role?: UserRole | null;
}): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: publicRole(user.role),
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

async function ensureModeratorRole(user: {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  role?: UserRole | null;
}) {
  if (
    isAdminEmail(user.email) ||
    user.role === "ADMIN" ||
    user.role === "MODERATOR" ||
    !isModeratorEmail(user.email)
  ) {
    return user;
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { role: "MODERATOR" },
  });
}

export async function registerUser(
  data: RegisterData
): Promise<AuthActionResult> {
  try {
    const username = normalizeUsername(data.username || "");
    if (!data.name || !data.email || !data.password || !data.username) {
      return { success: false, error: "Todos os campos são obrigatórios" };
    }
    if (!username) {
      return {
        success: false,
        error:
          "O nome de usuário precisa ter de 3 a 20 caracteres: letras, números ou _",
      };
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

    const takenUsername = await prisma.user.findUnique({ where: { username } });
    if (takenUsername) {
      return { success: false, error: "Esse @ já está em uso" };
    }

    const hashedPassword = await hash(data.password, 12);
    const email = data.email.toLowerCase().trim();
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        username,
        password: hashedPassword,
        role: roleForEmail(email),
      },
    });
    await ensureDefaultVault(user.id);

    return sessionFor(user);
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

    if (!user || !user.password) {
      return {
        success: false,
        error: user
          ? "Esta conta entra com o Google"
          : "Email ou senha inválidos",
      };
    }

    const isPasswordValid = await compare(data.password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: "Email ou senha inválidos" };
    }

    return sessionFor(await ensureModeratorRole(await ensureAdminRole(user)));
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

function sessionFor(user: {
  id: number;
  name: string;
  email: string;
  username?: string | null;
  createdAt: Date;
  updatedAt: Date;
  role?: UserRole | null;
}): AuthActionResult {
  const token = sign(
    { userId: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  return { success: true, user: toPublicUser(user), token };
}

function roleForEmail(email: string): UserRole {
  if (isAdminEmail(email)) return "ADMIN";
  if (isModeratorEmail(email)) return "MODERATOR";
  return "USER";
}

export async function loginWithGoogle(
  credential: string,
  requestedUsername?: string
): Promise<AuthActionResult> {
  try {
    const audiences = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID]
      .map((id) => id?.trim())
      .filter((id): id is string => Boolean(id));
    if (!credential || audiences.length === 0) {
      return { success: false, error: "Não foi possível entrar com o Google" };
    }

    const client = new OAuth2Client(audiences[0]);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: audiences,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase().trim();
    if (!payload?.sub || !email || payload.email_verified !== true) {
      return {
        success: false,
        error: "Não foi possível confirmar o email do Google",
      };
    }

    const googleName = payload.name?.trim() || email.split("@")[0];
    let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (user?.username) {
      if (user.googleId !== payload.sub) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub },
        });
      }
      return sessionFor(await ensureModeratorRole(await ensureAdminRole(user)));
    }

    if (!requestedUsername?.trim()) {
      return {
        success: false,
        needsUsername: true,
        email,
        name: user?.name || googleName,
      };
    }

    const username = normalizeUsername(requestedUsername);
    if (!username) {
      return {
        success: false,
        error:
          "O nome de usuário precisa ter de 3 a 20 caracteres: letras, números ou _",
      };
    }

    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken && taken.id !== user?.id) {
      return { success: false, error: "Esse @ já está em uso" };
    }

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { username, googleId: payload.sub },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: googleName,
          email,
          username,
          googleId: payload.sub,
          role: roleForEmail(email),
        },
      });
    }
    await ensureDefaultVault(user.id);

    return sessionFor(await ensureModeratorRole(await ensureAdminRole(user)));
  } catch (error) {
    return {
      success: false,
      error: publicErrorMessage(
        error,
        "Não foi possível entrar com o Google. Tente novamente em instantes."
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

    const currentUser = await ensureModeratorRole(await ensureAdminRole(user));
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

  loginWithGoogle(credential: string, username?: string) {
    return loginWithGoogle(credential, username);
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
