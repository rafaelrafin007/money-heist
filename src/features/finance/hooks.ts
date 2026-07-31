import { useMemo } from "react";

import {
  getBudgetsOverview,
  getDashboardOverview,
  getSavingsOverview,
  getSettingsOverview,
  getTransactionsOverview,
} from "@/src/features/finance/selectors";

export function useDashboardOverview() {
  return useMemo(() => getDashboardOverview(), []);
}

export function useTransactionsOverview() {
  return useMemo(() => getTransactionsOverview(), []);
}

export function useBudgetsOverview() {
  return useMemo(() => getBudgetsOverview(), []);
}

export function useSavingsOverview() {
  return useMemo(() => getSavingsOverview(), []);
}

export function useSettingsOverview() {
  return useMemo(() => getSettingsOverview(), []);
}
