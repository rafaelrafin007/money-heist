import type { CurrencyCode } from "@/src/types/money";

export type DashboardMetric = {
  label: string;
  valueMinorUnits: number;
  tone?: "default" | "success" | "danger" | "warning";
};

export type MockTransaction = {
  id: string;
  title: string;
  category: string;
  dateLabel: string;
  valueMinorUnits: number;
};

export const dashboardMock = {
  currency: "BDT" as CurrencyCode,
  totalBalanceMinorUnits: 28475000,
  metrics: [
    { label: "Income this month", valueMinorUnits: 8250000, tone: "success" },
    { label: "Expenses this month", valueMinorUnits: -4925000, tone: "danger" },
    { label: "Saved this month", valueMinorUnits: 2100000, tone: "success" },
    { label: "Potential savings", valueMinorUnits: 1850000, tone: "warning" },
  ] satisfies DashboardMetric[],
  recentTransactions: [
    {
      id: "mock-salary",
      title: "Salary deposit",
      category: "Income",
      dateLabel: "Jul 28",
      valueMinorUnits: 8250000,
    },
    {
      id: "mock-rent",
      title: "Apartment rent",
      category: "Housing",
      dateLabel: "Jul 25",
      valueMinorUnits: -2200000,
    },
    {
      id: "mock-savings-transfer",
      title: "Transfer to savings",
      category: "Own account transfer",
      dateLabel: "Jul 22",
      valueMinorUnits: -1500000,
    },
  ] satisfies MockTransaction[],
};
