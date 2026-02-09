import { sha256 } from "@/lib/hash";

export type HashableOrderItem = {
  qty: number;
  description: string;
};

function normalizeDescription(description: string): string {
  return description
    .trim()
    .toLowerCase()
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ");
}

export function makeItemsHash(items: HashableOrderItem[]): string {
  const normalized = items
    .map((item) => ({ qty: item.qty, description: normalizeDescription(item.description) }))
    .sort((a, b) => {
      if (a.description < b.description) return -1;
      if (a.description > b.description) return 1;
      return a.qty - b.qty;
    })
    .map((item) => `${item.qty}x:${item.description}`)
    .join("|");

  return sha256(normalized);
}
