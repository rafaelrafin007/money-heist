import { assertFirstDayOfMonth, getCalendarMonthRange } from "@/src/features/finance/dates";
import {
  assertPositiveMinorUnits,
  assertSafeMinorUnits,
  parseMoneyInputToMinor,
} from "@/src/features/finance/money";
import { assertCurrency, assertDateOnly, assertUuid } from "@/src/features/finance/api/databaseMappers";
import type { Budget, Category, CurrencyCode } from "@/src/features/finance/types";

export type BudgetStatus = "active" | "archived";

export type BudgetRow = {
  id: string;
  user_id: string;
  category_id: string;
  period_start: string;
  period_end: string;
  limit_minor: number;
  currency_code: string;
  status?: string;
  created_at: string;
  updated_at: string;
};

export type BudgetFormValues = {
  categoryId: string;
  monthStart: string;
  limit: string;
  currency: CurrencyCode;
};

export type BudgetUpdateValues = {
  limit: string;
  status?: BudgetStatus;
};

export function budgetRowToDomain(row: BudgetRow): Budget {
  assertUuid(row.id, "Budget id");
  assertUuid(row.user_id, "Budget user id");
  assertUuid(row.category_id, "Budget category id");
  assertPositiveMinorUnits(row.limit_minor, "Budget limit");

  const periodStart = assertDateOnly(row.period_start, "Budget period start");
  const periodEnd = assertDateOnly(row.period_end, "Budget period end");

  if (periodStart > periodEnd) {
    throw new Error("Budget period is invalid.");
  }

  return {
    id: row.id,
    categoryId: row.category_id,
    periodStart,
    periodEnd,
    limitMinor: row.limit_minor,
    currency: assertCurrency(row.currency_code),
    status: assertBudgetStatus(row.status ?? "active"),
  };
}

export function budgetFormToInsert(values: BudgetFormValues, userId: string, categories: Category[]) {
  assertUuid(userId, "User id");
  const category = getActiveExpenseCategory(categories, values.categoryId);
  const range = getCalendarMonthRange(values.monthStart);
  const limitMinor = parseMoneyInputToMinor(values.limit);
  assertPositiveMinorUnits(limitMinor, "Budget limit");
  const currency = assertCurrency(values.currency);

  return {
    user_id: userId,
    category_id: category.id,
    period_start: range.start,
    period_end: range.end,
    limit_minor: limitMinor,
    currency_code: currency,
    status: "active" as const,
  };
}

export function budgetFormToUpdate(values: BudgetUpdateValues) {
  const limitMinor = parseMoneyInputToMinor(values.limit);
  assertPositiveMinorUnits(limitMinor, "Budget limit");

  return {
    limit_minor: limitMinor,
    ...(values.status ? { status: assertBudgetStatus(values.status) } : {}),
  };
}

export function assertBudgetStatus(value: string): BudgetStatus {
  if (value !== "active" && value !== "archived") {
    throw new Error(`Invalid budget status: ${value}`);
  }
  return value;
}

export function assertBudgetMonth(value: string) {
  return assertFirstDayOfMonth(value);
}

function getActiveExpenseCategory(categories: Category[], categoryId: string) {
  assertUuid(categoryId, "Budget category id");
  const category = categories.find((item) => item.id === categoryId);

  if (!category) {
    throw new Error("Select a valid expense category.");
  }

  if (category.isArchived) {
    throw new Error("Archived categories cannot be used for active budgets.");
  }

  if (category.kind !== "expense") {
    throw new Error("Budgets must use an expense category.");
  }

  return category;
}

export function assertSafeBudgetLimit(value: number) {
  assertSafeMinorUnits(value, "Budget limit");
  assertPositiveMinorUnits(value, "Budget limit");
}
