import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseSiteOrder } from "@/lib/parsers/parseSiteOrder";
import { makeItemsHash } from "@/lib/orderItemsHash";
import { normalizeImportRawText, parseDateOnlyToUTC } from "@/lib/orders";
import { sha256 } from "@/lib/hash";

const previewSchema = z.object({
  rawText: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsedBody = previewSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ message: "Payload inválido", issues: parsedBody.error.flatten() }, { status: 400 });
  }

  const normalizedText = normalizeImportRawText(parsedBody.data.rawText);
  const rawHash = sha256(normalizedText);
  const parsed = parseSiteOrder(normalizedText);
  const itemsHash = parsed.order.items.length > 0 ? makeItemsHash(parsed.order.items) : null;

  const existing = await prisma.order.findUnique({ where: { importRawHash: rawHash }, select: { id: true } });

  let dedupeCandidates: Array<{
    id: string;
    deliveryDate: Date;
    totalCents: number;
    statusPedido: string;
    statusPagamento: string;
    createdAt: Date;
    sameTotal: boolean;
    sameItems: boolean;
    matchScore: number;
  }> = [];

  if (parsed.customer.phone && parsed.delivery.date) {
    const candidates = await prisma.order.findMany({
      where: {
        customer: { phone: parsed.customer.phone },
        deliveryDate: parseDateOnlyToUTC(parsed.delivery.date),
      },
      select: {
        id: true,
        deliveryDate: true,
        totalCents: true,
        itemsHash: true,
        statusPedido: true,
        statusPagamento: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    dedupeCandidates = candidates
      .map((candidate) => {
        const sameTotal =
          typeof parsed.order.totalCents === "number" && candidate.totalCents === parsed.order.totalCents;
        const sameItems = Boolean(itemsHash && candidate.itemsHash && candidate.itemsHash === itemsHash);
        const matchScore = (sameTotal ? 2 : 0) + (sameItems ? 2 : 0);

        return {
          ...candidate,
          sameTotal,
          sameItems,
          matchScore,
        };
      })
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  return NextResponse.json({
    rawHash,
    itemsHash,
    parsed,
    alreadyImported: Boolean(existing),
    dedupeCandidates,
  });
}
