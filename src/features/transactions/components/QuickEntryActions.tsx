import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/src/components/AppText";
import type { Account } from "@/src/features/finance/types";
import { getQuickEntryHref, type QuickEntryAction } from "@/src/features/transactions/quickEntry";
import { theme } from "@/src/theme";

type QuickEntryActionsProps = {
  accounts?: Account[];
  title?: string;
};

const actions: { action: QuickEntryAction; label: string; detail: string }[] = [
  { action: "income", label: "Income", detail: "Add money in" },
  { action: "expense", label: "Expense", detail: "Record spending" },
  { action: "save", label: "Save", detail: "Move to savings" },
  { action: "transfer", label: "Transfer", detail: "Move between accounts" },
];

export function QuickEntryActions({ accounts = [], title = "Quick entry" }: QuickEntryActionsProps) {
  const activeSavingsAccounts = accounts.filter((account) => account.isSavings && !account.isArchived);

  function handlePress(action: QuickEntryAction) {
    let href = getQuickEntryHref(action);

    if (action === "save" && activeSavingsAccounts.length === 1) {
      href = `${href}&destinationAccountId=${activeSavingsAccounts[0].id}` as Href;
    }

    router.push(href);
  }

  return (
    <View style={styles.container}>
      <AppText variant="label">{title}</AppText>
      <View style={styles.grid}>
        {actions.map((item) => (
          <Pressable
            accessibilityLabel={`${item.label}. ${item.detail}`}
            accessibilityRole="button"
            key={item.action}
            onPress={() => handlePress(item.action)}
            style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
          >
            <AppText variant="label">{item.label}</AppText>
            <AppText tone="subtle" variant="caption">{item.detail}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md },
  action: {
    width: "47%",
    minWidth: 140,
    flexGrow: 1,
    minHeight: 76,
    gap: theme.spacing.xs,
    justifyContent: "center",
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  pressed: { opacity: 0.86 },
});
