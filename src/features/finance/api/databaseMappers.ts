import {
  assertPositiveMinorUnits,
  assertSafeMinorUnits,
  parseMoneyInputToMinor,
} from "@/src/features/finance/money";
import type {
  Account,
  AccountType,
  Category,
  CategoryKind,
  CurrencyCode,
  ExpenseTransaction,
  IncomeTransaction,
  Transaction,
  TransactionStatus,
  TransferTransaction,
} from "@/src/features/finance/types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const currencyPattern = /^[A-Z]{3}$/;

export type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  currency_code: string;
  opening_balance_minor: number;
  is_savings: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  category_type: string;
  icon_name: string | null;
  is_system: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type TransactionRow = {
  id: string;
  user_id: string;
  transaction_type: string;
  amount_minor: number;
  currency_code: string;
  account_id: string;
  destination_account_id: string | null;
  category_id: string | null;
  occurred_at: string;
  note: string | null;
  transaction_status: string;
  created_at: string;
  updated_at: string;
};

export type AccountFormValues = {
  name: string;
  accountType: AccountType;
  currency: CurrencyCode;
  openingBalance: string;
  isSavings: boolean;
};

export type AccountUpdateValues = {
  name: string;
  isSavings: boolean;
};

export type CategoryFormValues = {
  name: string;
  kind: CategoryKind;
  iconName?: string;
};

export type TransactionFormValues = {
  type: "income" | "expense" | "transfer";
  amount: string;
  occurredAt: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  note?: string;
};

export type TransactionInsert = {
  user_id: string;
  transaction_type: "income" | "expense" | "transfer";
  amount_minor: number;
  currency_code: CurrencyCode;
  account_id: string;
  destination_account_id: string | null;
  category_id: string | null;
  occurred_at: string;
  note: string | null;
  transaction_status: "active";
};

export function accountRowToDomain(row: AccountRow): Account {
  assertUuid(row.id, "Account id");
  assertUuid(row.user_id, "Account user id");
  assertCurrency(row.currency_code);
  assertSafeMinorUnits(row.opening_balance_minor, "Opening balance");

  return {
    id: row.id,
    name: assertNonBlank(row.name, "Account name"),
    type: assertAccountType(row.account_type),
    currency: row.currency_code,
    openingBalanceMinor: row.opening_balance_minor,
    isSavings: Boolean(row.is_savings),
    isArchived: Boolean(row.is_archived),
    createdAt: assertIsoLike(row.created_at, "Account created_at"),
  };
}

export function categoryRowToDomain(row: CategoryRow): Category {
  assertUuid(row.id, "Category id");
  assertUuid(row.user_id, "Category user id");

  return {
    id: row.id,
    name: assertNonBlank(row.name, "Category name"),
    kind: assertCategoryKind(row.category_type),
    iconName: row.icon_name,
    isSystem: Boolean(row.is_system),
    isArchived: Boolean(row.is_archived),
    createdAt: assertIsoLike(row.created_at, "Category created_at"),
    updatedAt: assertIsoLike(row.updated_at, "Category updated_at"),
  };
}

export function transactionRowToDomain(row: TransactionRow): Transaction {
  assertUuid(row.id, "Transaction id");
  assertUuid(row.user_id, "Transaction user id");
  assertUuid(row.account_id, "Transaction account id");
  assertCurrency(row.currency_code);
  assertPositiveMinorUnits(row.amount_minor, "Transaction amount");
  const status = assertTransactionStatus(row.transaction_status);
  const occurredAt = assertDateOnly(row.occurred_at.slice(0, 10), "Transaction date");
  const base = {
    id: row.id,
    amountMinor: row.amount_minor,
    currency: row.currency_code,
    accountId: row.account_id,
    occurredAt,
    note: row.note ?? undefined,
    status,
    createdAt: assertIsoLike(row.created_at, "Transaction created_at"),
    updatedAt: assertIsoLike(row.updated_at, "Transaction updated_at"),
  };

  if (row.transaction_type === "income") {
    if (!row.category_id || row.destination_account_id) {
      throw new Error("Income transaction row has an invalid shape.");
    }
    assertUuid(row.category_id, "Income category id");
    return { ...base, type: "income", categoryId: row.category_id } satisfies IncomeTransaction;
  }

  if (row.transaction_type === "expense") {
    if (!row.category_id || row.destination_account_id) {
      throw new Error("Expense transaction row has an invalid shape.");
    }
    assertUuid(row.category_id, "Expense category id");
    return { ...base, type: "expense", categoryId: row.category_id } satisfies ExpenseTransaction;
  }

  if (row.transaction_type === "transfer") {
    if (!row.destination_account_id || row.category_id) {
      throw new Error("Transfer transaction row has an invalid shape.");
    }
    assertUuid(row.destination_account_id, "Transfer destination account id");
    if (row.account_id === row.destination_account_id) {
      throw new Error("Transfer source and destination accounts must differ.");
    }
    return {
      ...base,
      type: "transfer",
      destinationAccountId: row.destination_account_id,
    } satisfies TransferTransaction;
  }

  throw new Error(`Unsupported transaction type: ${row.transaction_type}`);
}

export function accountFormToInsert(values: AccountFormValues, userId: string) {
  assertUuid(userId, "User id");
  const openingBalanceMinor = parseMoneyInputToMinor(values.openingBalance || "0", { allowNegative: true });
  assertSafeMinorUnits(openingBalanceMinor, "Opening balance");
  assertCurrency(values.currency);

  return {
    user_id: userId,
    name: assertNonBlank(values.name, "Account name"),
    account_type: assertAccountType(values.accountType),
    currency_code: values.currency,
    opening_balance_minor: openingBalanceMinor,
    is_savings: Boolean(values.isSavings || values.accountType === "savings"),
  };
}

export function accountFormToUpdate(values: AccountUpdateValues) {
  return {
    name: assertNonBlank(values.name, "Account name"),
    is_savings: Boolean(values.isSavings),
  };
}

export function categoryFormToInsert(values: CategoryFormValues, userId: string) {
  assertUuid(userId, "User id");
  return {
    user_id: userId,
    name: assertNonBlank(values.name, "Category name"),
    category_type: assertCategoryKind(values.kind),
    icon_name: values.iconName?.trim() || null,
  };
}

export function categoryFormToUpdate(values: Pick<CategoryFormValues, "name" | "iconName">) {
  return {
    name: assertNonBlank(values.name, "Category name"),
    icon_name: values.iconName?.trim() || null,
  };
}

export function transactionFormToInsert(
  values: TransactionFormValues,
  userId: string,
  accounts: Account[],
  categories: Category[],
): TransactionInsert {
  assertUuid(userId, "User id");
  const amountMinor = parseMoneyInputToMinor(values.amount);
  assertPositiveMinorUnits(amountMinor, "Transaction amount");
  const source = getActiveAccount(accounts, values.accountId);
  assertDateOnly(values.occurredAt, "Transaction date");

  if (values.type === "transfer") {
    const destination = getActiveAccount(accounts, values.destinationAccountId ?? "");
    if (source.id === destination.id) {
      throw new Error("Transfer source and destination accounts must differ.");
    }
    if (source.currency !== destination.currency) {
      throw new Error("Transfers between different currencies are not supported.");
    }
    return {
      user_id: userId,
      transaction_type: "transfer",
      amount_minor: amountMinor,
      currency_code: source.currency,
      account_id: source.id,
      destination_account_id: destination.id,
      category_id: null,
      occurred_at: values.occurredAt,
      note: values.note?.trim() || null,
      transaction_status: "active",
    };
  }

  const category = getActiveCategory(categories, values.categoryId ?? "", values.type);

  return {
    user_id: userId,
    transaction_type: values.type,
    amount_minor: amountMinor,
    currency_code: source.currency,
    account_id: source.id,
    destination_account_id: null,
    category_id: category.id,
    occurred_at: values.occurredAt,
    note: values.note?.trim() || null,
    transaction_status: "active",
  };
}

export function transactionFormToUpdate(
  values: TransactionFormValues,
  existing: Transaction,
  accounts: Account[],
  categories: Category[],
) {
  if (values.type !== existing.type) {
    throw new Error("Transaction type cannot be changed.");
  }

  const insertShape = transactionFormToInsert(values, "00000000-0000-4000-8000-000000000000", accounts, categories);
  const { user_id: _userId, transaction_status: _status, ...updateValues } = insertShape;
  return updateValues;
}

export function assertAccountType(value: string): AccountType {
  const valid: AccountType[] = ["cash", "bank", "mobile_wallet", "savings", "credit_card", "investment", "loan"];
  if (!valid.includes(value as AccountType)) {
    throw new Error(`Invalid account type: ${value}`);
  }
  return value as AccountType;
}

export function assertCategoryKind(value: string): CategoryKind {
  if (value !== "income" && value !== "expense") {
    throw new Error(`Invalid category type: ${value}`);
  }
  return value;
}

export function assertTransactionStatus(value: string): TransactionStatus {
  const valid: TransactionStatus[] = ["active", "cancelled", "deleted", "inactive"];
  if (!valid.includes(value as TransactionStatus)) {
    throw new Error(`Invalid transaction status: ${value}`);
  }
  return value as TransactionStatus;
}

export function assertCurrency(value: string): CurrencyCode {
  if (!currencyPattern.test(value)) {
    throw new Error(`Invalid currency code: ${value}`);
  }
  return value;
}

export function assertUuid(value: string, label: string) {
  if (!uuidPattern.test(value)) {
    throw new Error(`${label} must be a valid UUID.`);
  }
}

export function assertDateOnly(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00`).getTime())) {
    throw new Error(`${label} must be a valid YYYY-MM-DD date.`);
  }
  return value;
}

function assertIsoLike(value: string, label: string) {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    throw new Error(`${label} must be a valid timestamp.`);
  }
  return value;
}

function assertNonBlank(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

function getActiveAccount(accounts: Account[], accountId: string) {
  const account = accounts.find((item) => item.id === accountId);
  if (!account) {
    throw new Error("Select a valid account.");
  }
  if (account.isArchived) {
    throw new Error("Archived accounts cannot be used for new transactions.");
  }
  return account;
}

function getActiveCategory(categories: Category[], categoryId: string, kind: CategoryKind) {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) {
    throw new Error("Select a valid category.");
  }
  if (category.isArchived) {
    throw new Error("Archived categories cannot be used for new transactions.");
  }
  if (category.kind !== kind) {
    throw new Error(`Select a ${kind} category.`);
  }
  return category;
}
