import type { FinanceDataset, MonthlyFinancePlan } from "@/src/features/finance/types";

export type SetupChecklistItem = {
  id: "account" | "income" | "expense" | "budget" | "savings" | "monthly-plan";
  label: string;
  detail: string;
  href: string;
  isComplete: boolean;
};

export function getSetupChecklistItems(dataset: FinanceDataset, monthlyPlan: MonthlyFinancePlan | null): SetupChecklistItem[] {
  const activeTransactions = dataset.transactions.filter((transaction) => transaction.status === "active");
  const hasSavingsAccount = dataset.accounts.some((account) => account.isSavings && !account.isArchived);

  return [
    {
      id: "account",
      label: "Create an account",
      detail: "Add cash, bank, wallet, card, or savings accounts.",
      href: "/accounts/new",
      isComplete: dataset.accounts.some((account) => !account.isArchived),
    },
    {
      id: "income",
      label: "Add first income",
      detail: "Record salary, freelance, business, or other income.",
      href: "/transactions/new?type=income",
      isComplete: activeTransactions.some((transaction) => transaction.type === "income"),
    },
    {
      id: "expense",
      label: "Record first expense",
      detail: "Capture daily spending by category.",
      href: "/transactions/new?type=expense",
      isComplete: activeTransactions.some((transaction) => transaction.type === "expense"),
    },
    {
      id: "budget",
      label: "Create a budget",
      detail: "Set a monthly spending limit for one category.",
      href: "/budgets/new",
      isComplete: dataset.budgets.some((budget) => budget.status === "active"),
    },
    {
      id: "savings",
      label: "Set up savings",
      detail: "Create a savings account or goal.",
      href: hasSavingsAccount ? "/savings/new" : "/accounts/new?savings=true",
      isComplete: hasSavingsAccount || dataset.savingsGoals.some((goal) => goal.status !== "archived"),
    },
    {
      id: "monthly-plan",
      label: "Complete monthly plan",
      detail: "Add estimates for income, obligations, and buffer.",
      href: "/planning",
      isComplete: Boolean(monthlyPlan),
    },
  ];
}

export function isSetupChecklistComplete(items: SetupChecklistItem[]) {
  return items.every((item) => item.isComplete);
}
