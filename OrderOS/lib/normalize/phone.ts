export function normalizePhoneBR(input: string): string {
  const trimmed = (input ?? "").trim();
  const hadPlus = trimmed.includes("+");
  let digits = trimmed.replace(/\D/g, "");

  if (hadPlus && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  return digits;
}
