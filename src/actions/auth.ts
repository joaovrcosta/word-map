"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
    const hashedPassword = await bcrypt.hash(data.password, 12);

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
    const isPasswordValid = await bcrypt.compare(
      data.password,
      (user as any).password
    );

    if (!isPasswordValid) {
      console.log("Senha inválida para usuário:", user.id);
      throw new Error("Email ou senha inválidos");
    }

    console.log("Senha válida, gerando JWT...");

    // Gerar JWT
    const token = jwt.sign(
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

    // Verificar JWT
    const decoded = jwt.verify(token.value, JWT_SECRET) as any;

    if (!decoded || !decoded.userId) {
      return null;
    }

    // Buscar usuário atualizado
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
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
