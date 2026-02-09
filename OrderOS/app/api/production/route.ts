import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyToUTC, todayDateISO } from "@/lib/orders";
import { zDateOnly } from "@/lib/zod";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? todayDateISO();

  const parsedDate = zDateOnly.safeParse(date);
  if (!parsedDate.success) {
    return NextResponse.json({ message: "date inválido. Use YYYY-MM-DD" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: {
      deliveryDate: parseDateOnlyToUTC(date),
      statusPedido: { not: "CANCELADO" },
    },
    include: {
      customer: { select: { name: true } },
      items: {
        include: {
          menuItem: { select: { name: true } },
        },
      },
    },
    orderBy: [{ deliveryOrder: "asc" }, { createdAt: "asc" }],
  });

  const totalsMap = new Map<string, number>();
  const byOrder = orders.map((order) => {
    const items = order.items.map((item) => {
      const name = item.menuItem?.name || item.freeName || "Item";
      totalsMap.set(name, (totalsMap.get(name) ?? 0) + item.qty);
      return { name, qty: item.qty };
    });

    return {
      orderId: order.id,
      customerName: order.customer.name,
      items,
    };
  });

  const totals = Array.from(totalsMap.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => {
      if (b.qty !== a.qty) {
        return b.qty - a.qty;
      }
      return a.name.localeCompare(b.name, "pt-BR");
    });

  return NextResponse.json({ date, totals, byOrder });
}
