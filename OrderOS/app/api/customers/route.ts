import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhoneBR } from "@/lib/normalize/phone";

const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal("")),
  addressText: z.string().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const digits = normalizePhoneBR(search);

  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            ...(digits ? [{ phone: { contains: digits } }] : []),
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createCustomerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Payload inválido", issues: parsed.error.flatten() }, { status: 400 });
  }

  const phone = normalizePhoneBR(parsed.data.phone);
  if (!phone) {
    return NextResponse.json({ message: "Telefone inválido" }, { status: 400 });
  }

  const existing = await prisma.customer.findUnique({ where: { phone }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ message: "Cliente com esse telefone já existe" }, { status: 409 });
  }

  const customer = await prisma.customer.create({
    data: {
      name: parsed.data.name.trim(),
      phone,
      email: parsed.data.email?.trim() || null,
      addressText: parsed.data.addressText?.trim() || null,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
