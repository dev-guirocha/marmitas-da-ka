import { prisma } from "@/lib/prisma";
import { normalizePhoneBR } from "@/lib/normalize/phone";
import { PrismaClient, Prisma } from "@prisma/client";

type UpsertCustomerInput = {
  name?: string;
  email?: string;
  phone: string;
  addressText?: string;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function upsertCustomerByPhone(input: UpsertCustomerInput, db: DbClient = prisma) {
  const phone = normalizePhoneBR(input.phone);
  if (!phone) {
    throw new Error("Telefone inválido");
  }

  const existing = await db.customer.findUnique({ where: { phone } });

  if (!existing) {
    return db.customer.create({
      data: {
        phone,
        name: input.name?.trim() || "Cliente",
        email: input.email?.trim() || null,
        addressText: input.addressText?.trim() || null,
      },
    });
  }

  const nextName = input.name?.trim();
  const nextEmail = input.email?.trim();
  const nextAddress = input.addressText?.trim();

  const data: {
    name?: string;
    email?: string;
    addressText?: string;
  } = {};

  if (!existing.name && nextName) {
    data.name = nextName;
  }
  if (!existing.email && nextEmail) {
    data.email = nextEmail;
  }
  if (!existing.addressText && nextAddress) {
    data.addressText = nextAddress;
  }

  if (Object.keys(data).length === 0) {
    return existing;
  }

  return db.customer.update({
    where: { id: existing.id },
    data,
  });
}
