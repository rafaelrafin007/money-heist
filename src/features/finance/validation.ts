import { isIsoDateInRange } from "@/src/features/finance/dates";
import {
  assertNonNegativeMinorUnits,
  assertPositiveMinorUnits,
  assertSameCurrency,
} from "@/src/features/finance/money";
import type {
  Account,
  Budget,
  Category,
  FinanceDataset,
  SavingsGoal,
  Transaction,
} from "@/src/features/finance/types";

export function isLiabilityAccount(account: Account) {
  return account.type === "credit_card" || account.type === "loan";
}

export function isAssetAccount(account: Account) {
  return !isLiabilityAccount(account);
}

export function validateFinanceDataset(dataset: FinanceDataset) {
  const accountsById = new Map(dataset.accounts.map((account) => [account.id, account]));
  const categoriesById = new Map(dataset.categories.map((category) => [category.id, category]));

  for (const account of dataset.accounts) {
    assertSameCurrency(dataset.currency, account.currency, `Account ${account.name}`);
    assertNonNegativeMinorUnits(Math.abs(account.openingBalanceMinor), `Opening balance for ${account.name}`);
  }

  for (const transaction of dataset.transactions) {
    validateTransaction(transaction, accountsById, categoriesById);
  }

  for (const budget of dataset.budgets) {
    validateBudget(budget, categoriesById, dataset.currency);
  }

  for (const goal of dataset.savingsGoals) {
    validateSavingsGoal(goal, accountsById, dataset.currency);
  }

  validateForecastCurrency(dataset);
}

export function validateTransaction(
  transaction: Transaction,
  accountsById: Map<string, Account>,
  categoriesById: Map<string, Category>,
) {
  assertPositiveMinorUnits(transaction.amountMinor, `Transaction ${transaction.id} amount`);
  const sourceAccount = accountsById.get(transaction.accountId);

  if (!sourceAccount) {
    throw new Error(`Transaction ${transaction.id} references missing account ${transaction.accountId}.`);
  }

  assertSameCurrency(sourceAccount.currency, transaction.currency, `Transaction ${transaction.id}`);

  if (transaction.type === "income" || transaction.type === "expense") {
    const category = categoriesById.get(transaction.categoryId);

    if (!category) {
      throw new Error(`Transaction ${transaction.id} references missing category ${transaction.categoryId}.`);
    }

    if (category.kind !== transaction.type) {
      throw new Error(`Transaction ${transaction.id} uses a ${category.kind} category for ${transaction.type}.`);
    }
  }

  if (transaction.type === "transfer") {
    if (transaction.accountId === transaction.destinationAccountId) {
      throw new Error(`Transaction ${transaction.id} transfers to the same account.`);
    }

    const destinationAccount = accountsById.get(transaction.destinationAccountId);

    if (!destinationAccount) {
      throw new Error(
        `Transaction ${transaction.id} references missing destination account ${transaction.destinationAccountId}.`,
      );
    }

    assertSameCurrency(sourceAccount.currency, destinationAccount.currency, `Transaction ${transaction.id}`);
  }
}

export function validateBudget(budget: Budget, categoriesById: Map<string, Category>, currency: string) {
  assertPositiveMinorUnits(budget.limitMinor, `Budget ${budget.id} limit`);
  assertSameCurrency(currency, budget.currency, `Budget ${budget.id}`);

  if (budget.periodStart > budget.periodEnd) {
    throw new Error(`Budget ${budget.id} has an invalid period.`);
  }

  if (budget.status !== "active" && budget.status !== "archived") {
    throw new Error(`Budget ${budget.id} has an invalid status.`);
  }

  const category = categoriesById.get(budget.categoryId);

  if (!category) {
    throw new Error(`Budget ${budget.id} references missing category ${budget.categoryId}.`);
  }

  if (category.kind !== "expense") {
    throw new Error(`Budget ${budget.id} must reference an expense category.`);
  }
}

export function validateSavingsGoal(
  goal: SavingsGoal,
  accountsById: Map<string, Account>,
  currency: string,
) {
  assertPositiveMinorUnits(goal.targetMinor, `Savings goal ${goal.id} target`);
  assertSameCurrency(currency, goal.currency, `Savings goal ${goal.id}`);

  if (goal.currentAmountMinor !== undefined) {
    assertNonNegativeMinorUnits(goal.currentAmountMinor, `Savings goal ${goal.id} current amount`);
  }

  if (goal.linkedAccountId) {
    const linkedAccount = accountsById.get(goal.linkedAccountId);

    if (!linkedAccount) {
      throw new Error(`Savings goal ${goal.id} references missing account ${goal.linkedAccountId}.`);
    }

    if (!isAssetAccount(linkedAccount) || !linkedAccount.isSavings) {
      throw new Error(`Savings goal ${goal.id} must link to a savings asset account.`);
    }

    assertSameCurrency(goal.currency, linkedAccount.currency, `Savings goal ${goal.id}`);
  }
}

function validateForecastCurrency(dataset: FinanceDataset) {
  assertSameCurrency(dataset.currency, dataset.forecast.currency, "Potential savings forecast");
  assertNonNegativeMinorUnits(dataset.forecast.availableLiquidCashMinor, "Available liquid cash");
  assertNonNegativeMinorUnits(dataset.forecast.expectedRemainingIncomeMinor, "Expected income");
  assertNonNegativeMinorUnits(dataset.forecast.upcomingFixedExpensesMinor, "Upcoming fixed expenses");
  assertNonNegativeMinorUnits(dataset.forecast.remainingVariableBudgetMinor, "Remaining variable budget");
  assertNonNegativeMinorUnits(dataset.forecast.debtObligationsMinor, "Debt obligations");
  assertNonNegativeMinorUnits(dataset.forecast.safetyBufferMinor, "Safety buffer");
}

export function activeTransactionsInRange(transactions: Transaction[], range: { start: string; end: string }) {
  return transactions.filter(
    (transaction) => transaction.status === "active" && isIsoDateInRange(transaction.occurredAt, range),
  );
}
