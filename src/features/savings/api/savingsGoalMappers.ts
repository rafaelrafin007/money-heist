import {
  assertNonNegativeMinorUnits,
  assertPositiveMinorUnits,
  parseMoneyInputToMinor,
} from "@/src/features/finance/money";
import { assertCurrency, assertDateOnly, assertUuid } from "@/src/features/finance/api/databaseMappers";
import type { Account, CurrencyCode, SavingsGoal, SavingsGoalStatus } from "@/src/features/finance/types";
import { isAssetAccount } from "@/src/features/finance/validation";

export type SavingsGoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_minor: number;
  currency_code: string;
  current_amount_minor: number;
  target_date: string | null;
  status: string;
  linked_account_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SavingsGoalFormValues = {
  name: string;
  target: string;
  currency: CurrencyCode;
  targetDate?: string;
  linkedAccountId: string;
};

export type SavingsGoalUpdateValues = SavingsGoalFormValues & {
  status: SavingsGoalStatus;
};

export function savingsGoalRowToDomain(row: SavingsGoalRow): SavingsGoal {
  assertUuid(row.id, "Savings goal id");
  assertUuid(row.user_id, "Savings goal user id");
  assertPositiveMinorUnits(row.target_minor, "Savings goal target");
  assertNonNegativeMinorUnits(row.current_amount_minor, "Savings goal current amount");

  if (row.linked_account_id) {
    assertUuid(row.linked_account_id, "Linked savings account id");
  }

  return {
    id: row.id,
    name: assertNonBlank(row.name, "Savings goal name"),
    targetMinor: row.target_minor,
    currency: assertCurrency(row.currency_code),
    currentAmountMinor: row.current_amount_minor,
    targetDate: row.target_date ? assertDateOnly(row.target_date, "Target date") : undefined,
    linkedAccountId: row.linked_account_id ?? undefined,
    status: assertSavingsGoalStatus(row.status),
  };
}

export function savingsGoalFormToInsert(
  values: SavingsGoalFormValues,
  userId: string,
  accounts: Account[],
  existingGoals: SavingsGoal[],
) {
  assertUuid(userId, "User id");
  const linkedAccount = getEligibleLinkedSavingsAccount(accounts, values.linkedAccountId, values.currency);
  assertUniqueActiveLinkedAccount(existingGoals, linkedAccount.id);
  const targetMinor = parseMoneyInputToMinor(values.target);
  assertPositiveMinorUnits(targetMinor, "Savings goal target");

  return {
    user_id: userId,
    name: assertNonBlank(values.name, "Savings goal name"),
    target_minor: targetMinor,
    currency_code: assertCurrency(values.currency),
    current_amount_minor: 0,
    target_date: values.targetDate ? assertDateOnly(values.targetDate, "Target date") : null,
    linked_account_id: linkedAccount.id,
    status: "active" as const,
  };
}

export function savingsGoalFormToUpdate(
  values: SavingsGoalUpdateValues,
  currentGoalId: string,
  accounts: Account[],
  existingGoals: SavingsGoal[],
) {
  assertUuid(currentGoalId, "Savings goal id");
  const status = assertSavingsGoalStatus(values.status);
  const linkedAccount = getEligibleLinkedSavingsAccount(accounts, values.linkedAccountId, values.currency);

  if (status === "active" || status === "paused") {
    assertUniqueActiveLinkedAccount(existingGoals, linkedAccount.id, currentGoalId);
  }

  const targetMinor = parseMoneyInputToMinor(values.target);
  assertPositiveMinorUnits(targetMinor, "Savings goal target");

  return {
    name: assertNonBlank(values.name, "Savings goal name"),
    target_minor: targetMinor,
    currency_code: assertCurrency(values.currency),
    target_date: values.targetDate ? assertDateOnly(values.targetDate, "Target date") : null,
    linked_account_id: linkedAccount.id,
    status,
  };
}

export function savingsGoalStatusToUpdate(status: SavingsGoalStatus) {
  return { status: assertSavingsGoalStatus(status) };
}

export function assertSavingsGoalStatus(value: string): SavingsGoalStatus {
  const valid: SavingsGoalStatus[] = ["active", "paused", "completed", "archived"];
  if (!valid.includes(value as SavingsGoalStatus)) {
    throw new Error(`Invalid savings goal status: ${value}`);
  }
  return value as SavingsGoalStatus;
}

export function getEligibleLinkedSavingsAccount(accounts: Account[], accountId: string, currency: CurrencyCode) {
  assertUuid(accountId, "Linked savings account id");
  const account = accounts.find((item) => item.id === accountId);

  if (!account) {
    throw new Error("Select a valid linked savings account.");
  }

  if (account.isArchived) {
    throw new Error("Archived savings accounts cannot be linked to active goals.");
  }

  if (!isAssetAccount(account) || !account.isSavings) {
    throw new Error("Savings goals must link to an active asset account marked as savings.");
  }

  if (account.currency !== currency) {
    throw new Error("Savings goal currency must match the linked savings account.");
  }

  return account;
}

function assertUniqueActiveLinkedAccount(goals: SavingsGoal[], linkedAccountId: string, currentGoalId?: string) {
  const duplicate = goals.find(
    (goal) =>
      goal.id !== currentGoalId &&
      goal.linkedAccountId === linkedAccountId &&
      (goal.status === "active" || goal.status === "paused"),
  );

  if (duplicate) {
    throw new Error("This savings account is already linked to an active or paused goal.");
  }
}

function assertNonBlank(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}
