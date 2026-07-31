export type CurrencyCode = "BDT" | (string & {});

export type AccountType =
  | "cash"
  | "bank"
  | "mobile_wallet"
  | "savings"
  | "credit_card"
  | "investment"
  | "loan";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  openingBalanceMinor: number;
  isSavings: boolean;
  isArchived: boolean;
  createdAt: string;
};

export type CategoryKind = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  color?: string;
};

export type TransactionStatus = "active" | "cancelled" | "deleted" | "inactive";

type TransactionBase = {
  id: string;
  amountMinor: number;
  currency: CurrencyCode;
  occurredAt: string;
  note?: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
};

export type IncomeTransaction = TransactionBase & {
  type: "income";
  accountId: string;
  categoryId: string;
};

export type ExpenseTransaction = TransactionBase & {
  type: "expense";
  accountId: string;
  categoryId: string;
};

export type TransferTransaction = TransactionBase & {
  type: "transfer";
  accountId: string;
  destinationAccountId: string;
};

export type AdjustmentTransaction = TransactionBase & {
  type: "adjustment";
  accountId: string;
  direction: "increase" | "decrease";
  reason: string;
};

export type Transaction =
  | IncomeTransaction
  | ExpenseTransaction
  | TransferTransaction
  | AdjustmentTransaction;

export type Budget = {
  id: string;
  categoryId: string;
  periodStart: string;
  periodEnd: string;
  limitMinor: number;
  currency: CurrencyCode;
};

export type SavingsGoalStatus = "active" | "paused" | "completed" | "archived";

export type SavingsGoal = {
  id: string;
  name: string;
  targetMinor: number;
  currency: CurrencyCode;
  currentAmountMinor?: number;
  linkedAccountId?: string;
  targetDate?: string;
  status: SavingsGoalStatus;
};

export type PotentialSavingsForecastInput = {
  currency: CurrencyCode;
  availableLiquidCashMinor: number;
  expectedRemainingIncomeMinor: number;
  upcomingFixedExpensesMinor: number;
  remainingVariableBudgetMinor: number;
  debtObligationsMinor: number;
  safetyBufferMinor: number;
};

export type FinanceDataset = {
  currency: CurrencyCode;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  forecast: PotentialSavingsForecastInput;
};
