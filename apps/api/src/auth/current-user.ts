import { AsyncLocalStorage } from "async_hooks";

export type UserRole = "USER" | "MODERATOR" | "ADMIN";

export function isContentStaff(role: UserRole) {
  return role === "ADMIN" || role === "MODERATOR";
}

export interface User {
  id: number;
  name: string;
  email: string;
  username: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: UserRole;
}

const storage = new AsyncLocalStorage<User | null>();

export function runWithUser<T>(user: User | null, fn: () => T): T {
  return storage.run(user, fn);
}

export async function getCurrentUser(): Promise<User | null> {
  return storage.getStore() ?? null;
}
