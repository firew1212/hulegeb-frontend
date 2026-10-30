export function formatETB(value: string | number, locale: string = "en"): string {
  const number = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(number)) return "—";
  const tag = locale === "am" ? "am-ET" : "en-ET";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 2,
  }).format(number);
}

export function priceRange(variants: { price: string | number }[], locale: string = "en"): string {
  if (!variants.length) return "—";
  const prices = variants.map((v) =>
    typeof v.price === "string" ? Number(v.price) : v.price,
  );
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return formatETB(min, locale);
  return `${formatETB(min, locale)} – ${formatETB(max, locale)}`;
}
