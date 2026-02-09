import { OrderSource, OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { z } from "zod";

export const zId = z.string().min(1);

export const zDateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD");

export const zOrderStatus = z.nativeEnum(OrderStatus);
export const zPaymentStatus = z.nativeEnum(PaymentStatus);
export const zPaymentMethod = z.nativeEnum(PaymentMethod);
export const zOrderSource = z.nativeEnum(OrderSource);

export const zPhone = z
  .string()
  .min(8)
  .max(20)
  .regex(/^\d+$/, "Telefone deve conter somente dígitos");
