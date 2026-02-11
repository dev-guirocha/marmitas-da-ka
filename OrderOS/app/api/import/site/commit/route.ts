import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseSiteOrder } from "@/lib/parsers/parseSiteOrder";
import { mapPaymentMethodRaw, normalizeImportRawText, parseDateOnlyToUTC } from "@/lib/orders";
import { sha256 } from "@/lib/hash";
import { upsertCustomerByPhone } from "@/lib/customers";
import { makeItemsHash } from "@/lib/orderItemsHash";

const commitSchema = z.object({
  rawText: z.string().min(1),
  force: z.boolean().optional(),
});

const REQUIRED_FIELDS = new Set(["phone", "date", "totalCents", "address", "items"]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsedBody = commitSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ message: "Payload inválido", issues: parsedBody.error.flatten() }, { status: 400 });
  }

  const { rawText, force = false } = parsedBody.data;
  const normalizedText = normalizeImportRawText(rawText);
  const parsed = parseSiteOrder(normalizedText);
  const rawHash = sha256(normalizedText);

  const alreadyImported = await prisma.order.findUnique({
    where: { importRawHash: rawHash },
    select: { id: true },
  });

  if (alreadyImported && !force) {
    return NextResponse.json(
      { message: "Pedido já importado", alreadyImported: true, orderId: alreadyImported.id },
      { status: 409 },
    );
  }

  const missing = parsed.confidence.missing.filter((field) => REQUIRED_FIELDS.has(field));
  if (missing.length > 0) {
    return NextResponse.json(
      {
        message: "Campos obrigatórios ausentes para importar pedido",
        missing,
      },
      { status: 422 },
    );
  }

  if (typeof parsed.order.totalCents !== "number" || !parsed.delivery.date) {
    return NextResponse.json(
      { message: "Campos obrigatórios ausentes para importar pedido", missing: ["date", "totalCents"] },
      { status: 422 },
    );
  }

  const totalCents = parsed.order.totalCents;
  const deliveryDate = parsed.delivery.date;
  const statusPagamento = parsed.order.paymentStatusNormalized ?? "PENDENTE";
  const paymentMethod = mapPaymentMethodRaw(parsed.order.paymentMethod);
  const itemsHash = makeItemsHash(parsed.order.items);
  const duplicateOfId = alreadyImported?.id ?? null;
  const forceImportNote =
    alreadyImported && force
      ? `[FORCE_IMPORT] duplicate_of=${alreadyImported.id} raw_hash=${rawHash} at=${new Date().toISOString()}`
      : null;

  const order = await prisma.$transaction(async (tx) => {
    const customer = await upsertCustomerByPhone(
      {
        phone: parsed.customer.phone,
        name: parsed.customer.name,
        email: parsed.customer.email,
        addressText: parsed.delivery.address,
      },
      tx,
    );

    return tx.order.create({
      data: {
        source: "SITE_LISTA",
        customerId: customer.id,
        statusPedido: "RECEBIDO",
        statusPagamento,
        paymentMethod,
        totalCents,
        paidCents: statusPagamento === "PAGO" ? totalCents : 0,
        deliveryFeeCents: 0,
        addressSnapshot: parsed.delivery.address,
        windowSnapshot: parsed.delivery.windowLabel,
        deliveryDate: parseDateOnlyToUTC(deliveryDate),
        deliveryWindowStart: parsed.delivery.windowStart,
        deliveryWindowEnd: parsed.delivery.windowEnd,
        importRawHash: alreadyImported && force ? null : rawHash,
        itemsHash,
        notes: forceImportNote,
        items: {
          createMany: {
            data: parsed.order.items.map((item) => ({
              qty: item.qty,
              freeName: item.description,
              unitPriceCents: null,
              subtotalCents: null,
            })),
          },
        },
      },
      select: { id: true },
    });
  });

  return NextResponse.json({ orderId: order.id, duplicateOfId }, { status: 201 });
}
