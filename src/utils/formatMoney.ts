import type { CurrencyCode } from "@/src/types/money";

export function formatMinorUnitAmount(value: number, currency: CurrencyCode = "BDT") {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);
  const majorUnits = Math.trunc(absoluteValue / 100);
  const minorUnits = absoluteValue % 100;
  const major = new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 0,
  }).format(majorUnits);

  return `${sign}${currency} ${major}.${minorUnits.toString().padStart(2, "0")}`;
}
