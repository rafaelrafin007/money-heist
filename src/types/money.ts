export type CurrencyCode = "BDT" | (string & {});

export type MinorUnitAmount = {
  currency: CurrencyCode;
  value: number;
};
