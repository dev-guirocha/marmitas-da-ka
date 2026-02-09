import { PaymentMethod } from "@prisma/client";

export function todayDateISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseDateOnlyToUTC(dateISO: string): Date {
  return new Date(`${dateISO}T00:00:00.000Z`);
}

export function normalizeImportRawText(rawText: string): string {
  return (rawText ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .trim();
}

export function mapPaymentMethodRaw(raw?: string): PaymentMethod {
  const value = (raw ?? "").toUpperCase();

  if (value.includes("PIX")) {
    return "PIX";
  }
  if (value.includes("DINHEIRO")) {
    return "DINHEIRO";
  }
  if (value.includes("CARTAO") || value.includes("CARTÃO") || value.includes("CREDITO") || value.includes("CRÉDITO") || value.includes("DEBITO") || value.includes("DÉBITO")) {
    return "CARTAO";
  }

  return "OUTRO";
}
