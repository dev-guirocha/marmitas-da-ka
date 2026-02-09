import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createItemSchema = z.object({
  menuId: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  isActive: z.boolean().optional(),
});

const patchItemSchema = z
  .object({
    name: z.string().min(1).optional(),
    priceCents: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe pelo menos um campo para atualizar",
  });

export async function GET(req: NextRequest) {
  const menuId = req.nextUrl.searchParams.get("menuId");

  const items = await prisma.menuItem.findMany({
    where: menuId ? { menuId } : undefined,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Payload inválido", issues: parsed.error.flatten() }, { status: 400 });
  }

  const menu = await prisma.menu.findUnique({ where: { id: parsed.data.menuId }, select: { id: true } });
  if (!menu) {
    return NextResponse.json({ message: "Menu não encontrado" }, { status: 404 });
  }

  const item = await prisma.menuItem.create({
    data: {
      ...parsed.data,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ message: "Query param id é obrigatório" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Payload inválido", issues: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(item);
}
