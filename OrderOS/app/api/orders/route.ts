import { NextRequest, NextResponse } from "next/server";
import { OrderSource, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { zDateOnly, zOrderStatus, zPaymentMethod, zPaymentStatus } from "@/lib/zod";
import { normalizePhoneBR } from "@/lib/normalize/phone";
import { parseDateOnlyToUTC, todayDateISO } from "@/lib/orders";
import { upsertCustomerByPhone } from "@/lib/customers";
import { makeItemsHash } from "@/lib/orderItemsHash";

const orderItemInputSchema = z
  .object({
    menuItemId: z.string().min(1).optional(),
    freeName: z.string().min(1).optional(),
    qty: z.number().int().positive(),
    unitPriceCents: z.number().int().nonnegative().optional(),
  })
  .refine((value) => Boolean(value.menuItemId || value.freeName), {
    message: "menuItemId ou freeName é obrigatório",
  });

const createOrderSchema = z.object({
  customer: z.object({
    phone: z.string().min(8),
    name: z.string().min(1),
    email: z.string().email().optional(),
    addressText: z.string().optional(),
  }),
  delivery: z.object({
    date: zDateOnly,
    address: z.string().min(1),
    windowLabel: z.string().optional(),
    windowStart: z.string().optional(),
    windowEnd: z.string().optional(),
  }),
  payment: z.object({
    method: zPaymentMethod,
    totalCents: z.number().int().nonnegative().optional(),
    paidCents: z.number().int().nonnegative().optional(),
    statusPagamento: zPaymentStatus.optional(),
    deliveryFeeCents: z.number().int().nonnegative().optional(),
  }),
  items: z.array(orderItemInputSchema).min(1),
  notes: z.string().optional(),
  source: z.nativeEnum(OrderSource).optional(),
});

function inferPaymentStatus(totalCents: number, paidCents: number): PaymentStatus {
  if (paidCents <= 0) {
    return "PENDENTE";
  }
  if (paidCents >= totalCents) {
    return "PAGO";
  }
  return "PARCIAL";
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? todayDateISO();
  const statusPedido = req.nextUrl.searchParams.get("statusPedido");
  const statusPagamento = req.nextUrl.searchParams.get("statusPagamento");
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();

  const parsedDate = zDateOnly.safeParse(date);
  if (!parsedDate.success) {
    return NextResponse.json({ message: "date inválido. Use YYYY-MM-DD" }, { status: 400 });
  }

  const parsedStatusPedido = statusPedido ? zOrderStatus.safeParse(statusPedido) : null;
  if (statusPedido && !parsedStatusPedido?.success) {
    return NextResponse.json({ message: "statusPedido inválido" }, { status: 400 });
  }

  const parsedStatusPagamento = statusPagamento ? zPaymentStatus.safeParse(statusPagamento) : null;
  if (statusPagamento && !parsedStatusPagamento?.success) {
    return NextResponse.json({ message: "statusPagamento inválido" }, { status: 400 });
  }

  const normalizedSearchPhone = normalizePhoneBR(search);

  const orders = await prisma.order.findMany({
    where: {
      deliveryDate: parseDateOnlyToUTC(date),
      ...(parsedStatusPedido?.success ? { statusPedido: parsedStatusPedido.data } : {}),
      ...(parsedStatusPagamento?.success ? { statusPagamento: parsedStatusPagamento.data } : {}),
      ...(search
        ? {
            OR: [
              { addressSnapshot: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              ...(normalizedSearchPhone ? [{ customer: { phone: { contains: normalizedSearchPhone } } }] : []),
            ],
          }
        : {}),
    },
    include: {
      customer: { select: { name: true, phone: true } },
      items: {
        include: { menuItem: { select: { name: true } } },
      },
    },
    orderBy: [{ deliveryOrder: "asc" }, { createdAt: "asc" }],
  });

  const payload = orders.map((order) => ({
    id: order.id,
    deliveryOrder: order.deliveryOrder,
    customer: order.customer,
    addressSnapshot: order.addressSnapshot,
    windowSnapshot: order.windowSnapshot,
    totalCents: order.totalCents,
    paidCents: order.paidCents,
    statusPedido: order.statusPedido,
    statusPagamento: order.statusPagamento,
    createdAt: order.createdAt,
    itemsSummary: order.items.map((item) => `${item.qty}x ${item.freeName || item.menuItem?.name || "Item"}`),
  }));

  return NextResponse.json(payload);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Payload inválido", issues: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const phone = normalizePhoneBR(data.customer.phone);
  if (!phone) {
    return NextResponse.json({ message: "Telefone inválido" }, { status: 400 });
  }

  const menuItemIds = Array.from(new Set(data.items.map((item) => item.menuItemId).filter(Boolean))) as string[];

  const menuItems =
    menuItemIds.length > 0
      ? await prisma.menuItem.findMany({
          where: { id: { in: menuItemIds } },
          select: { id: true, name: true, priceCents: true },
        })
      : [];

  const menuItemsById = new Map(menuItems.map((item) => [item.id, item]));

  const computedItems = data.items.map((item) => {
    if (item.menuItemId) {
      const menuItem = menuItemsById.get(item.menuItemId);
      if (!menuItem) {
        throw new Error(`menuItemId inválido: ${item.menuItemId}`);
      }

      const unitPriceCents = menuItem.priceCents;
      const subtotalCents = item.qty * unitPriceCents;

      return {
        menuItemId: menuItem.id,
        freeName: item.freeName,
        qty: item.qty,
        unitPriceCents,
        subtotalCents,
        hashDescription: menuItem.name,
      };
    }

    if (typeof item.unitPriceCents !== "number") {
      throw new Error("unitPriceCents é obrigatório para item avulso");
    }

    const unitPriceCents = item.unitPriceCents;
    const subtotalCents = item.qty * unitPriceCents;

    return {
      menuItemId: undefined,
      freeName: item.freeName,
      qty: item.qty,
      unitPriceCents,
      subtotalCents,
      hashDescription: item.freeName || "item",
    };
  });

  const itemsTotal = computedItems.reduce((acc, item) => acc + item.subtotalCents, 0);
  const deliveryFeeCents = data.payment.deliveryFeeCents ?? 0;
  const totalCents = itemsTotal + deliveryFeeCents;
  const itemsHash = makeItemsHash(computedItems.map((item) => ({ qty: item.qty, description: item.hashDescription })));

  const paidCentsInput = data.payment.paidCents ?? 0;
  const statusPagamento = data.payment.statusPagamento ?? inferPaymentStatus(totalCents, paidCentsInput);
  const paidCents = statusPagamento === "PAGO" ? totalCents : Math.min(paidCentsInput, totalCents);

  try {
    const order = await prisma.$transaction(async (tx) => {
      const customer = await upsertCustomerByPhone(
        {
          phone,
          name: data.customer.name,
          email: data.customer.email,
          addressText: data.customer.addressText,
        },
        tx,
      );

      return tx.order.create({
        data: {
          source: "MANUAL",
          customerId: customer.id,
          statusPedido: "RECEBIDO",
          statusPagamento,
          paymentMethod: data.payment.method,
          totalCents,
          paidCents,
          deliveryFeeCents,
          addressSnapshot: data.delivery.address,
          windowSnapshot: data.delivery.windowLabel,
          deliveryDate: parseDateOnlyToUTC(data.delivery.date),
          deliveryWindowStart: data.delivery.windowStart,
          deliveryWindowEnd: data.delivery.windowEnd,
          notes: data.notes,
          itemsHash,
          items: {
            create: computedItems.map((item) => ({
              menuItemId: item.menuItemId,
              freeName: item.freeName,
              qty: item.qty,
              unitPriceCents: item.unitPriceCents,
              subtotalCents: item.subtotalCents,
            })),
          },
        },
        include: {
          items: true,
          customer: true,
        },
      });
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar pedido";
    return NextResponse.json({ message }, { status: 400 });
  }
}
