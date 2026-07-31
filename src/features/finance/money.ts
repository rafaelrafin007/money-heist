import type { CurrencyCode } from "@/src/features/finance/types";

export type Money = {
  amountMinor: number;
  currency: CurrencyCode;
};

const moneyInputPattern = /^-?(?:(?:\d{1,3}(?:,\d{3})+)|\d+)(?:\.\d{1,2})?$/;

export function assertSafeMinorUnits(value: number, label = "Amount") {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer minor-unit value.`);
  }
}

export function assertPositiveMinorUnits(value: number, label = "Amount") {
  assertSafeMinorUnits(value, label);

  if (value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

export function assertNonNegativeMinorUnits(value: number, label = "Amount") {
  assertSafeMinorUnits(value, label);

  if (value < 0) {
    throw new Error(`${label} must not be negative.`);
  }
}

export function assertSameCurrency(left: CurrencyCode, right: CurrencyCode, context = "Money operation") {
  if (left !== right) {
    throw new Error(`${context} currency mismatch: ${left} cannot be combined with ${right}.`);
  }
}

export function assertMoneyCurrency(left: Money, right: Money, context?: string) {
  assertSameCurrency(left.currency, right.currency, context);
}

function checked(value: number, label = "Result") {
  assertSafeMinorUnits(value, label);
  return value;
}

export function addMinor(left: number, right: number) {
  assertSafeMinorUnits(left, "Left amount");
  assertSafeMinorUnits(right, "Right amount");
  return checked(left + right);
}

export function subtractMinor(left: number, right: number) {
  assertSafeMinorUnits(left, "Left amount");
  assertSafeMinorUnits(right, "Right amount");
  return checked(left - right);
}

export function compareMinor(left: number, right: number) {
  assertSafeMinorUnits(left, "Left amount");
  assertSafeMinorUnits(right, "Right amount");
  return left === right ? 0 : left > right ? 1 : -1;
}

export function addMoney(left: Money, right: Money): Money {
  assertMoneyCurrency(left, right, "Add money");
  return { amountMinor: addMinor(left.amountMinor, right.amountMinor), currency: left.currency };
}

export function subtractMoney(left: Money, right: Money): Money {
  assertMoneyCurrency(left, right, "Subtract money");
  return { amountMinor: subtractMinor(left.amountMinor, right.amountMinor), currency: left.currency };
}

export function parseMoneyInputToMinor(input: string, options: { allowNegative?: boolean } = {}) {
  const value = input.trim();

  if (!value) {
    throw new Error("Money input is required.");
  }

  if (!moneyInputPattern.test(value)) {
    throw new Error(`Invalid money input: ${input}`);
  }

  const isNegative = value.startsWith("-");

  if (isNegative && !options.allowNegative) {
    throw new Error("Negative money input is not allowed here.");
  }

  const unsigned = isNegative ? value.slice(1) : value;
  const [majorPart, minorPart = ""] = unsigned.split(".");
  const normalizedMajor = majorPart.replaceAll(",", "");
  const normalizedMinor = minorPart.padEnd(2, "0");
  const combined = `${normalizedMajor}${normalizedMinor}`;
  const asBigInt = BigInt(combined);

  if (asBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Money input exceeds the safe integer range.");
  }

  const amountMinor = Number(asBigInt) * (isNegative ? -1 : 1);
  assertSafeMinorUnits(amountMinor);
  return amountMinor;
}

export function formatMinorAsCurrency(
  amountMinor: number,
  currency: CurrencyCode = "BDT",
  locale = "en-BD",
) {
  assertSafeMinorUnits(amountMinor);
  const sign = amountMinor < 0 ? "-" : "";
  const absoluteValue = Math.abs(amountMinor);
  const majorUnits = Math.trunc(absoluteValue / 100);
  const minorUnits = absoluteValue % 100;
  const major = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(majorUnits);

  return `${sign}${currency} ${major}.${minorUnits.toString().padStart(2, "0")}`;
}

export function minorToDisplayParts(amountMinor: number) {
  assertSafeMinorUnits(amountMinor);
  const sign = amountMinor < 0 ? -1 : 1;
  const absoluteValue = Math.abs(amountMinor);

  return {
    sign,
    major: Math.trunc(absoluteValue / 100),
    minor: absoluteValue % 100,
  };
}
