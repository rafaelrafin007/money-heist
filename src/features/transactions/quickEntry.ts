import type { Href } from "expo-router";

import { assertIsoDate, toIsoDate } from "@/src/features/finance/dates";
import type { Account, Transaction } from "@/src/features/finance/types";

export type QuickEntryAction = "income" | "expense" | "save" | "transfer";
export type TransactionEntryMode = "standard" | "savings";

export type TransactionRoutePreset = {
  type?: string | string[];
  mode?: string | string[];
  accountId?: string | string[];
  sourceAccountId?: string | string[];
  destinationAccountId?: string | string[];
  date?: string | string[];
};

export type SanitizedTransactionPreset = {
  type: "income" | "expense" | "transfer";
  mode: TransactionEntryMode;
  accountId: string;
  destinationAccountId: string;
  occurredAt: string;
};

export function getQuickEntryHref(action: QuickEntryAction, referenceDate = new Date()): Href {
  const today = toIsoDate(referenceDate);

  if (action === "income") {
    return `/transactions/new?type=income&date=${today}` as Href;
  }

  if (action === "expense") {
    return `/transactions/new?type=expense&date=${today}` as Href;
  }

  if (action === "save") {
    return `/transactions/new?type=transfer&mode=savings&date=${today}` as Href;
  }

  return `/transactions/new?type=transfer&date=${today}` as Href;
}

export function sanitizeTransactionRoutePreset(
  params: TransactionRoutePreset,
  accounts: Account[],
  referenceDate = new Date(),
): SanitizedTransactionPreset {
  const type = first(params.type);
  const mode = first(params.mode);
  const date = first(params.date);
  const accountId = first(params.sourceAccountId) || first(params.accountId);
  const destinationAccountId = first(params.destinationAccountId);
  const sanitizedType = type === "income" || type === "expense" || type === "transfer" ? type : "expense";
  const sanitizedMode = mode === "savings" ? "savings" : "standard";

  return {
    type: sanitizedType,
    mode: sanitizedMode,
    accountId: getActiveAccountId(accounts, accountId),
    destinationAccountId: getActiveAccountId(accounts, destinationAccountId),
    occurredAt: date ? safeIsoDateOrToday(date, referenceDate) : toIsoDate(referenceDate),
  };
}

export function getTransactionSuccessMessage(transaction: Transaction, mode: TransactionEntryMode) {
  if (transaction.type === "income") {
    return "Income added";
  }

  if (transaction.type === "expense") {
    return "Expense recorded";
  }

  if (mode === "savings") {
    return "Money moved to savings";
  }

  return "Transfer completed";
}

function getActiveAccountId(accounts: Account[], accountId?: string) {
  if (!accountId) {
    return "";
  }

  const account = accounts.find((item) => item.id === accountId);
  return account && !account.isArchived ? account.id : "";
}

function safeIsoDateOrToday(date: string, referenceDate: Date) {
  try {
    return assertIsoDate(date);
  } catch {
    return toIsoDate(referenceDate);
  }
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
