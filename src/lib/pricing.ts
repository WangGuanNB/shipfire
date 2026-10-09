export function minorToMajor(minor: number, currency: string): number {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return minor / 10 ** digits;
}
export function formatPrice(amount: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : locale, { style: "currency", currency }).format(amount);
}
