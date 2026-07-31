import { formatMinorAsCurrency } from "@/src/features/finance/money";
import type { CurrencyCode } from "@/src/features/finance/types";

export function formatMinorUnitAmount(value: number, currency: CurrencyCode = "BDT") {
  return formatMinorAsCurrency(value, currency);
}
