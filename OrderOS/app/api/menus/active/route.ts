import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const menu = await prisma.menu.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!menu) {
    return NextResponse.json({ message: "Nenhum cardápio ativo" }, { status: 404 });
  }

  return NextResponse.json(menu);
}
