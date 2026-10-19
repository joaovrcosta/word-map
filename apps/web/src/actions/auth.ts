export type UserRole = "USER" | "MODERATOR" | "ADMIN";

export interface User {
  id: number;
  name: string;
  email: string;
  username: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: UserRole;
}

export type AuthActionResult =
  | { success: true; user: User }
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

import { browserApi } from "@/lib/api/resources";

export const registerUser = browserApi.registerUser as (
  data: RegisterData
) => Promise<AuthActionResult>;
export const loginUser = browserApi.loginUser as (
  data: LoginData
) => Promise<AuthActionResult>;
export const loginWithGoogle = browserApi.loginWithGoogle as (
  credential: string,
  username?: string
) => Promise<AuthActionResult>;
export const logoutUser = browserApi.logoutUser as () => Promise<void>;
export const getCurrentUser = browserApi.getCurrentUser as () => Promise<User | null>;
export const isAuthenticated = browserApi.isAuthenticated as () => Promise<boolean>;
export const generateResetCode = browserApi.generateResetCode as (
  email: string
) => Promise<{ success: boolean; message: string }>;
export const verifyResetCode = browserApi.verifyResetCode as (
  email: string,
  code: string
) => Promise<{ success: boolean; message: string }>;
export const resetPassword = browserApi.resetPassword as (
  email: string,
  code: string,
  newPassword: string
) => Promise<{ success: boolean; message: string }>;
