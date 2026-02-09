import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyToUTC } from "@/lib/orders";
import { zDateOnly, zOrderStatus, zPaymentMethod, zPaymentStatus } from "@/lib/zod";

const setStatusSchema = z.object({
  op: z.literal("SET_STATUS"),
  statusPedido: zOrderStatus,
});

const setPaymentSchema = z.object({
  op: z.literal("SET_PAYMENT"),
  statusPagamento: zPaymentStatus,
  paidCents: z.number().int().nonnegative().optional(),
  paymentMethod: zPaymentMethod.optional(),
});

const patchOrderSchema = z
  .object({
    notes: z.string().optional(),
    addressSnapshot: z.string().min(1).optional(),
    windowSnapshot: z.string().optional(),
    deliveryDate: zDateOnly.optional(),
    deliveryWindowStart: z.string().optional(),
    deliveryWindowEnd: z.string().optional(),
    deliveryOrder: z.number().int().nonnegative().optional(),
    statusPedido: zOrderStatus.optional(),
    statusPagamento: zPaymentStatus.optional(),
    paidCents: z.number().int().nonnegative().optional(),
    paymentMethod: zPaymentMethod.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nenhum campo para atualizar",
  });

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          menuItem: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ message: "Pedido não encontrado" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const setStatus = setStatusSchema.safeParse(body);
  if (setStatus.success) {
    const order = await prisma.order.update({
      where: { id },
      data: { statusPedido: setStatus.data.statusPedido },
    });

    return NextResponse.json(order);
  }

  const setPayment = setPaymentSchema.safeParse(body);
  if (setPayment.success) {
    const order = await prisma.order.update({
      where: { id },
      data: {
        statusPagamento: setPayment.data.statusPagamento,
        ...(typeof setPayment.data.paidCents === "number" ? { paidCents: setPayment.data.paidCents } : {}),
        ...(setPayment.data.paymentMethod ? { paymentMethod: setPayment.data.paymentMethod } : {}),
      },
    });

    return NextResponse.json(order);
  }

  const patchParsed = patchOrderSchema.safeParse(body);
  if (!patchParsed.success) {
    return NextResponse.json({ message: "Payload inválido", issues: patchParsed.error.flatten() }, { status: 400 });
  }

  const data = patchParsed.data;

  const order = await prisma.order.update({
    where: { id },
    data: {
      ...data,
      ...(data.deliveryDate ? { deliveryDate: parseDateOnlyToUTC(data.deliveryDate) } : {}),
    },
  });

  return NextResponse.json(order);
}
