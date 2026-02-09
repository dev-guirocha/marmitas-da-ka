export function parseBRLToCents(input: string): number | null {
  if (!input) {
    return null;
  }

  const raw = input.replace(/\s/g, "").replace(/^R\$/i, "");
  const onlyValidChars = raw.replace(/[^\d,.-]/g, "");

  if (!onlyValidChars) {
    return null;
  }

  const normalized = onlyValidChars
    .replace(/\./g, "")
    .replace(/,(?=\d{1,2}$)/, ".")
    .replace(/,/g, "");

  const value = Number(normalized);
  if (Number.isNaN(value)) {
    return null;
  }

  return Math.round(value * 100);
}
