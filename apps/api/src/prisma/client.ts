import { PrismaClient } from "@prisma/client";

const holder: { client: PrismaClient | null } = { client: null };

export function bindPrisma(client: PrismaClient) {
  holder.client = client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = holder.client;
    if (!client) {
      throw new Error("Prisma não inicializado");
    }
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
