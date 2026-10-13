import "server-only";
import { serverApi } from "@/lib/api/server";
export type { User, UserRole, AuthActionResult, LoginData, RegisterData } from "./auth";

export const getCurrentUser = serverApi.getCurrentUser;
export const isAuthenticated = serverApi.isAuthenticated;
