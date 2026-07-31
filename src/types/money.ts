import type { CurrencyCode } from "@/src/features/finance/types";

export type MinorUnitAmount = {
  currency: CurrencyCode;
  value: number;
};

export type { CurrencyCode };
