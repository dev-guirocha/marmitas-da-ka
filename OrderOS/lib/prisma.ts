import { Prisma, PrismaClient } from "@prisma/client";

const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
const log: Prisma.LogLevel[] = appEnv === "development" ? ["warn", "error"] : ["error"];

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log,
  });

if (appEnv !== "production") {
  globalForPrisma.prisma = prisma;
}
