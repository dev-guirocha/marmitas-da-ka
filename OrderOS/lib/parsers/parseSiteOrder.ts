import { PaymentStatus } from "@prisma/client";
import { parseBRDate } from "@/lib/normalize/date";
import { parseBRLToCents } from "@/lib/normalize/money";
import { normalizePhoneBR } from "@/lib/normalize/phone";

export type ParsedSiteOrder = {
  source: "SITE_LISTA";
  customer: {
    name: string;
    email?: string;
    phone: string;
  };
  delivery: {
    date?: string;
    windowLabel?: string;
    windowStart?: string;
    windowEnd?: string;
    address: string;
  };
  order: {
    planName?: string;
    items: { qty: number; description: string }[];
    paymentMethod?: string;
    totalCents?: number;
    paymentStatusRaw?: string;
    paymentStatusNormalized?: PaymentStatus;
  };
  confidence: {
    overall: number;
    missing: string[];
  };
};

function pickLine(regex: RegExp, text: string): string | undefined {
  const match = text.match(regex);
  return match?.[1]?.trim();
}

function normalizePaymentMethod(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }

  const value = raw.toUpperCase();
  if (value.includes("PIX")) {
    return "PIX";
  }
  if (value.includes("DINHEIRO")) {
    return "DINHEIRO";
  }
  if (
    value.includes("CARTAO") ||
    value.includes("CARTÃO") ||
    value.includes("CRÉDITO") ||
    value.includes("DEBITO") ||
    value.includes("DÉBITO")
  ) {
    return "CARTAO";
  }

  return "OUTRO";
}

export function normalizePaymentStatusRaw(raw?: string): PaymentStatus | undefined {
  if (!raw) {
    return undefined;
  }

  const value = raw.toLowerCase();

  if (value.includes("aguard") || value.includes("pend")) {
    return "PENDENTE";
  }
  if (value.includes("pago") || value.includes("confirm")) {
    return "PAGO";
  }
  if (value.includes("parcial")) {
    return "PARCIAL";
  }
  if (value.includes("estorno")) {
    return "ESTORNADO";
  }

  return undefined;
}

function parseTimeWindow(label?: string): { start?: string; end?: string } {
  if (!label) {
    return {};
  }

  const match = label.match(/(\d{1,2})h(?::?(\d{2}))?\s*(?:às|as|a)\s*(\d{1,2})h(?::?(\d{2}))?/i);

  if (!match) {
    return {};
  }

  const sh = match[1].padStart(2, "0");
  const sm = (match[2] ?? "00").padStart(2, "0");
  const eh = match[3].padStart(2, "0");
  const em = (match[4] ?? "00").padStart(2, "0");

  return {
    start: `${sh}:${sm}`,
    end: `${eh}:${em}`,
  };
}

function parseItems(rawText: string): { qty: number; description: string }[] {
  const items: { qty: number; description: string }[] = [];

  for (const line of rawText.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:-\s*)?(\d+)\s*(?:x|×)\s+(.+)\s*$/i);
    if (!match) {
      continue;
    }

    items.push({
      qty: Number(match[1]),
      description: match[2].trim(),
    });
  }

  return items;
}

export function parseSiteOrder(rawText: string): ParsedSiteOrder {
  const text = (rawText ?? "").replace(/\r\n/g, "\n");

  const planName = pickLine(/^Plano\s+(.+?):/im, text);
  const customerName = pickLine(/^-\s*Nome:\s*(.+)$/im, text) ?? "";
  const customerEmail = pickLine(/^-\s*Email:\s*(.+)$/im, text);
  const customerPhone = normalizePhoneBR(pickLine(/^-\s*Telefone:\s*(.+)$/im, text) ?? "");

  const dateBR = pickLine(/Data\s+de\s+entrega\s+das\s+marmitas:\s*([0-3]?\d\/[01]?\d\/\d{4})/i, text);
  const dateISO = dateBR ? parseBRDate(dateBR) ?? undefined : undefined;

  const address = pickLine(/Endere[cç]o\s+de\s+entrega:\s*(.+)$/im, text) ?? "";
  const windowLabel = pickLine(/Hor[áa]rio\s+escolhido:\s*(.+)$/im, text);
  const window = parseTimeWindow(windowLabel);

  const paymentRaw = pickLine(/Pagamento:\s*(.+)$/im, text);
  const totalRaw = pickLine(/Valor\s+total:\s*(.+)$/im, text);
  const paymentStatusRaw = pickLine(/Status:\s*(.+)$/im, text);

  const items = parseItems(text);
  const totalCents = totalRaw ? parseBRLToCents(totalRaw) ?? undefined : undefined;

  const missing: string[] = [];
  const criticalMissing = [
    { key: "phone", ok: Boolean(customerPhone) },
    { key: "date", ok: Boolean(dateISO) },
    { key: "totalCents", ok: typeof totalCents === "number" },
    { key: "address", ok: Boolean(address) },
    { key: "items", ok: items.length > 0 },
  ];

  for (const item of criticalMissing) {
    if (!item.ok) {
      missing.push(item.key);
    }
  }

  const overall = Number(Math.max(0, 1 - missing.length * 0.15).toFixed(2));

  return {
    source: "SITE_LISTA",
    customer: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    },
    delivery: {
      date: dateISO,
      windowLabel,
      windowStart: window.start,
      windowEnd: window.end,
      address,
    },
    order: {
      planName,
      items,
      paymentMethod: normalizePaymentMethod(paymentRaw),
      totalCents,
      paymentStatusRaw,
      paymentStatusNormalized: normalizePaymentStatusRaw(paymentStatusRaw),
    },
    confidence: {
      overall,
      missing,
    },
  };
}
