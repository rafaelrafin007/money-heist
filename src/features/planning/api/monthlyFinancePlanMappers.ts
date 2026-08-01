import { assertFirstDayOfMonth } from "@/src/features/finance/dates";
import {
  assertNonNegativeMinorUnits,
  parseMoneyInputToMinor,
} from "@/src/features/finance/money";
import { assertCurrency, assertUuid } from "@/src/features/finance/api/databaseMappers";
import type { CurrencyCode, MonthlyFinancePlan } from "@/src/features/finance/types";

export type MonthlyFinancePlanRow = {
  id: string;
  user_id: string;
  month_start: string;
  currency_code: string;
  expected_remaining_income_minor: number;
  upcoming_fixed_expenses_minor: number;
  debt_obligations_minor: number;
  safety_buffer_minor: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MonthlyFinancePlanFormValues = {
  monthStart: string;
  currency: CurrencyCode;
  expectedRemainingIncome: string;
  upcomingFixedExpenses: string;
  debtObligations: string;
  safetyBuffer: string;
  notes?: string;
};

export function monthlyFinancePlanRowToDomain(row: MonthlyFinancePlanRow): MonthlyFinancePlan {
  assertUuid(row.id, "Monthly finance plan id");
  assertUuid(row.user_id, "Monthly finance plan user id");
  const expectedRemainingIncomeMinor = assertNonNegative(row.expected_remaining_income_minor, "Expected remaining income");
  const upcomingFixedExpensesMinor = assertNonNegative(row.upcoming_fixed_expenses_minor, "Upcoming fixed expenses");
  const debtObligationsMinor = assertNonNegative(row.debt_obligations_minor, "Debt obligations");
  const safetyBufferMinor = assertNonNegative(row.safety_buffer_minor, "Safety buffer");

  return {
    id: row.id,
    monthStart: assertFirstDayOfMonth(row.month_start),
    currency: assertCurrency(row.currency_code),
    expectedRemainingIncomeMinor,
    upcomingFixedExpensesMinor,
    debtObligationsMinor,
    safetyBufferMinor,
    notes: row.notes ?? undefined,
    createdAt: assertIsoLike(row.created_at, "Monthly plan created_at"),
    updatedAt: assertIsoLike(row.updated_at, "Monthly plan updated_at"),
  };
}

export function monthlyFinancePlanFormToUpsert(values: MonthlyFinancePlanFormValues, userId: string) {
  assertUuid(userId, "User id");

  return {
    user_id: userId,
    month_start: assertFirstDayOfMonth(values.monthStart),
    currency_code: assertCurrency(values.currency),
    expected_remaining_income_minor: parseNonNegativeMoney(values.expectedRemainingIncome, "Expected remaining income"),
    upcoming_fixed_expenses_minor: parseNonNegativeMoney(values.upcomingFixedExpenses, "Upcoming fixed expenses"),
    debt_obligations_minor: parseNonNegativeMoney(values.debtObligations, "Debt obligations"),
    safety_buffer_minor: parseNonNegativeMoney(values.safetyBuffer, "Safety buffer"),
    notes: values.notes?.trim() || null,
  };
}

function parseNonNegativeMoney(value: string, label: string) {
  const amountMinor = parseMoneyInputToMinor(value || "0");
  return assertNonNegative(amountMinor, label);
}

function assertNonNegative(value: number, label: string) {
  assertNonNegativeMinorUnits(value, label);
  return value;
}

function assertIsoLike(value: string, label: string) {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    throw new Error(`${label} must be a valid timestamp.`);
  }
  return value;
}
