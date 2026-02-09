import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createMenuSchema = z.object({
  name: z.string().min(1),
  monthRef: z.string().regex(/^\d{4}-\d{2}$/, "monthRef deve estar em YYYY-MM"),
});

const activateMenuSchema = z.object({
  id: z.string().min(1),
});

export async function GET() {
  const menus = await prisma.menu.findMany({
    orderBy: [{ isActive: "desc" }, { monthRef: "desc" }, { createdAt: "desc" }],
    include: {
      items: {
        orderBy: { name: "asc" },
      },
    },
  });

  return NextResponse.json(menus);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createMenuSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Payload inválido", issues: parsed.error.flatten() }, { status: 400 });
  }

  const menu = await prisma.menu.create({
    data: {
      ...parsed.data,
      isActive: false,
    },
  });

  return NextResponse.json(menu, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = activateMenuSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Payload inválido", issues: parsed.error.flatten() }, { status: 400 });
  }

  const menu = await prisma.$transaction(async (tx) => {
    await tx.menu.updateMany({ data: { isActive: false } });

    return tx.menu.update({
      where: { id: parsed.data.id },
      data: { isActive: true },
    });
  });

  return NextResponse.json(menu);
}
