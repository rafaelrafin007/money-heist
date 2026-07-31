import { describe, expect, it } from "vitest";

import {
  accountFormToInsert,
  accountRowToDomain,
  categoryRowToDomain,
  transactionFormToInsert,
  transactionRowToDomain,
  type AccountRow,
  type CategoryRow,
  type TransactionRow,
} from "@/src/features/finance/api/databaseMappers";
import { getRealDashboardOverview } from "@/src/features/finance/api/realFinanceSelectors";
import type { Account, Category, Transaction } from "@/src/features/finance/types";

const userId = "00000000-0000-4000-8000-000000000001";
const bankId = "00000000-0000-4000-8000-000000000002";
const cashId = "00000000-0000-4000-8000-000000000003";
const savingsId = "00000000-0000-4000-8000-000000000004";
const incomeCategoryId = "00000000-0000-4000-8000-000000000005";
const expenseCategoryId = "00000000-0000-4000-8000-000000000006";
const createdAt = "2026-07-31T00:00:00Z";

const accountRow: AccountRow = {
  id: bankId,
  user_id: userId,
  name: "Main bank",
  account_type: "bank",
  currency_code: "BDT",
  opening_balance_minor: 10000,
  is_savings: false,
  is_archived: false,
  created_at: createdAt,
  updated_at: createdAt,
};

const incomeCategoryRow: CategoryRow = {
  id: incomeCategoryId,
  user_id: userId,
  name: "Salary",
  category_type: "income",
  icon_name: null,
  is_system: true,
  is_archived: false,
  created_at: createdAt,
  updated_at: createdAt,
};

const expenseCategoryRow: CategoryRow = {
  ...incomeCategoryRow,
  id: expenseCategoryId,
  name: "Food",
  category_type: "expense",
};

const accounts: Account[] = [
  accountRowToDomain(accountRow),
  accountRowToDomain({ ...accountRow, id: cashId, name: "Cash", account_type: "cash", opening_balance_minor: 0 }),
  accountRowToDomain({ ...accountRow, id: savingsId, name: "Savings", account_type: "savings", opening_balance_minor: 0, is_savings: true }),
];
const categories: Category[] = [categoryRowToDomain(incomeCategoryRow), categoryRowToDomain(expenseCategoryRow)];

describe("database row mapping", () => {
  it("maps a valid account row", () => {
    expect(accountRowToDomain(accountRow)).toMatchObject({
      id: bankId,
      name: "Main bank",
      type: "bank",
      openingBalanceMinor: 10000,
    });
  });

  it("rejects an invalid account row", () => {
    expect(() => accountRowToDomain({ ...accountRow, account_type: "crypto" })).toThrow(/Invalid account type/);
  });

  it("maps valid income, expense, and transfer rows", () => {
    expect(transactionRowToDomain(baseTransactionRow("income"))).toMatchObject({ type: "income", categoryId: incomeCategoryId });
    expect(transactionRowToDomain(baseTransactionRow("expense"))).toMatchObject({ type: "expense", categoryId: expenseCategoryId });
    expect(transactionRowToDomain(baseTransactionRow("transfer"))).toMatchObject({ type: "transfer", destinationAccountId: cashId });
  });

  it("rejects invalid transfer shape, unsafe amount, invalid category type, and invalid status", () => {
    expect(() => transactionRowToDomain({ ...baseTransactionRow("transfer"), destination_account_id: null })).toThrow(/invalid shape/);
    expect(() => transactionRowToDomain({ ...baseTransactionRow("income"), amount_minor: Number.MAX_SAFE_INTEGER + 1 })).toThrow(/safe integer/);
    expect(() => categoryRowToDomain({ ...incomeCategoryRow, category_type: "transfer" })).toThrow(/Invalid category type/);
    expect(() => transactionRowToDomain({ ...baseTransactionRow("income"), transaction_status: "posted" })).toThrow(/Invalid transaction status/);
  });
});

describe("form mapping", () => {
  it("parses exact income, expense, and transfer amounts", () => {
    expect(transactionFormToInsert({ type: "income", amount: "1,250.75", accountId: bankId, categoryId: incomeCategoryId, occurredAt: "2026-07-31" }, userId, accounts, categories).amount_minor).toBe(125075);
    expect(transactionFormToInsert({ type: "expense", amount: "100.50", accountId: bankId, categoryId: expenseCategoryId, occurredAt: "2026-07-31" }, userId, accounts, categories).amount_minor).toBe(10050);
    expect(transactionFormToInsert({ type: "transfer", amount: "50.01", accountId: bankId, destinationAccountId: cashId, occurredAt: "2026-07-31" }, userId, accounts, categories).amount_minor).toBe(5001);
  });

  it("rejects same-account transfers, currency mismatch, wrong category type, and archived accounts", () => {
    expect(() => transactionFormToInsert({ type: "transfer", amount: "10", accountId: bankId, destinationAccountId: bankId, occurredAt: "2026-07-31" }, userId, accounts, categories)).toThrow(/differ/);
    expect(() => transactionFormToInsert({ type: "transfer", amount: "10", accountId: bankId, destinationAccountId: cashId, occurredAt: "2026-07-31" }, userId, [accounts[0], { ...accounts[1], currency: "USD" }], categories)).toThrow(/different currencies/);
    expect(() => transactionFormToInsert({ type: "income", amount: "10", accountId: bankId, categoryId: expenseCategoryId, occurredAt: "2026-07-31" }, userId, accounts, categories)).toThrow(/income category/);
    expect(() => transactionFormToInsert({ type: "expense", amount: "10", accountId: bankId, categoryId: expenseCategoryId, occurredAt: "2026-07-31" }, userId, [{ ...accounts[0], isArchived: true }], categories)).toThrow(/Archived accounts/);
  });

  it("maps account forms with exact opening balance parsing", () => {
    expect(accountFormToInsert({ name: "Cash", accountType: "cash", currency: "BDT", openingBalance: "0.01", isSavings: false }, userId).opening_balance_minor).toBe(1);
  });
});

describe("dashboard integration", () => {
  it("maps persisted rows into accounting selectors", () => {
    const transactions: Transaction[] = [
      transactionRowToDomain(baseTransactionRow("income")),
      transactionRowToDomain(baseTransactionRow("expense")),
      transactionRowToDomain(baseTransactionRow("transfer")),
      transactionRowToDomain({ ...baseTransactionRow("expense"), id: "00000000-0000-4000-8000-000000000099", transaction_status: "cancelled", amount_minor: 999999 }),
    ];
    const overview = getRealDashboardOverview(accounts, categories, transactions);

    expect(overview.incomeMinor).toBe(50000);
    expect(overview.expensesMinor).toBe(10000);
    expect(overview.savedThisMonthMinor).toBe(0);
    expect(overview.liquidBalanceMinor).toBe(50000);
  });
});

function baseTransactionRow(type: "income" | "expense" | "transfer"): TransactionRow {
  return {
    id: type === "income" ? "00000000-0000-4000-8000-000000000010" : type === "expense" ? "00000000-0000-4000-8000-000000000011" : "00000000-0000-4000-8000-000000000012",
    user_id: userId,
    transaction_type: type,
    amount_minor: type === "expense" ? 10000 : 50000,
    currency_code: "BDT",
    account_id: bankId,
    destination_account_id: type === "transfer" ? cashId : null,
    category_id: type === "income" ? incomeCategoryId : type === "expense" ? expenseCategoryId : null,
    occurred_at: "2026-07-31T00:00:00Z",
    note: null,
    transaction_status: "active",
    created_at: createdAt,
    updated_at: createdAt,
  };
}
