"use server";

import { prisma } from "@/lib/prisma";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  sendEmail,
  generateResetEmailHtml,
  generateResetEmailText,
} from "@/lib/email";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// Registrar novo usuário
export async function registerUser(data: RegisterData): Promise<User> {
  try {
    console.log("Tentando registrar usuário:", {
      email: data.email,
      name: data.name,
    });

    // Validar dados
    if (!data.name || !data.email || !data.password) {
      throw new Error("Todos os campos são obrigatórios");
    }

    if (data.password.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres");
    }

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error("Este email já está em uso");
    }

    // Hash da senha
    const hashedPassword = await hash(data.password, 12);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
      } as any,
    });

    console.log("Usuário registrado com sucesso:", user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    throw error;
  }
}

// Fazer login
export async function loginUser(data: LoginData): Promise<User> {
  try {
    console.log("Tentando fazer login para:", data.email);

    // Validar dados
    if (!data.email || !data.password) {
      throw new Error("Email e senha são obrigatórios");
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      console.log("Usuário não encontrado para:", data.email);
      throw new Error("Email ou senha inválidos");
    }

    console.log("Usuário encontrado:", user.id);

    // Verificar senha
    const isPasswordValid = await compare(
      data.password,
      (user as any).password
    );

    if (!isPasswordValid) {
      console.log("Senha inválida para usuário:", user.id);
      throw new Error("Email ou senha inválidos");
    }

    console.log("Senha válida, gerando JWT...");

    // Gerar JWT
    const token = sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("JWT gerado, salvando cookie...");

    // Salvar token no cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 dias
    });

    console.log("Cookie salvo, login concluído para usuário:", user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    throw error;
  }
}

// Fazer logout
export async function logoutUser(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("auth-token");
    redirect("/login");
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    throw error;
  }
}

// Verificar se o usuário está autenticado
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token");

    if (!token) {
      return null;
    }

    // Verificar JWT usando jose (consistente com o middleware)
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token.value, secret);

    if (!payload || !payload.userId) {
      return null;
    }

    // Buscar usuário atualizado
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as number },
    });

    if (!user) {
      // Usuário não existe mais no banco, limpar cookie
      console.log(
        "Usuário não encontrado no banco, limpando cookie de autenticação"
      );
      const cookieStore = await cookies();
      cookieStore.delete("auth-token");
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    console.error("Erro ao verificar usuário:", error);
    return null;
  }
}

// Verificar se o usuário está autenticado (para middleware)
export async function isAuthenticated(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return user !== null;
  } catch (error) {
    return false;
  }
}

// Gerar código de reset
export async function generateResetCode(email: string) {
  try {
    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, message: "Usuário não encontrado" };
    }

    // Gerar código de 6 dígitos
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Salvar código no banco (em produção, usar tabela separada)
    await prisma.user.update({
      where: { email },
      data: {
        resetCode,
        resetCodeExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
      },
    });

    // Enviar email com o código
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

    return {
      success: true,
      message: "Código de reset enviado para seu email",
    };
  } catch (error) {
    console.error("Erro ao gerar código de reset:", error);
    return { success: false, message: "Erro interno do servidor" };
  }
}

// Verificar código de reset
export async function verifyResetCode(email: string, code: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

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
  } catch (error) {
    console.error("Erro ao verificar código de reset:", error);
    return { success: false, message: "Erro interno do servidor" };
  }
}

// Resetar senha
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
) {
  try {
    // Verificar código primeiro
    const codeVerification = await verifyResetCode(email, code);
    if (!codeVerification.success) {
      return codeVerification;
    }

    // Hash da nova senha
    const hashedPassword = await hash(newPassword, 12);

    // Atualizar senha e limpar código de reset
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpires: null,
      },
    });

    return { success: true, message: "Senha alterada com sucesso" };
  } catch (error) {
    console.error("Erro ao resetar senha:", error);
    return { success: false, message: "Erro interno do servidor" };
  }
}
