import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppCard } from "@/src/components/AppCard";
import { AppText } from "@/src/components/AppText";
import type { Account } from "@/src/features/finance/types";
import { getQuickEntryHref, type QuickEntryAction } from "@/src/features/transactions/quickEntry";
import { theme } from "@/src/theme";

type QuickEntryActionsProps = {
  accounts?: Account[];
  title?: string;
};

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const actions: { action: QuickEntryAction; label: string; detail: string; icon: IconName; color: string; surface: string }[] = [
  { action: "income", label: "Income", detail: "Add money in", icon: "arrow-down-circle-outline", color: theme.colors.success, surface: theme.colors.successSurface },
  { action: "expense", label: "Expense", detail: "Record spending", icon: "arrow-up-circle-outline", color: theme.colors.danger, surface: theme.colors.dangerSurface },
  { action: "save", label: "Save", detail: "Move to savings", icon: "shield-checkmark-outline", color: theme.colors.primary, surface: theme.colors.surfaceTint },
  { action: "transfer", label: "Transfer", detail: "Between accounts", icon: "swap-horizontal-outline", color: theme.colors.warning, surface: theme.colors.warningSurface },
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
      <View style={styles.headingRow}>
        <AppText variant="label">{title}</AppText>
        <AppText tone="subtle" variant="caption">Fast actions</AppText>
      </View>
      <View style={styles.grid}>
        {actions.map((item) => (
          <Pressable
            accessibilityLabel={`${item.label}. ${item.detail}`}
            accessibilityRole="button"
            key={item.action}
            onPress={() => handlePress(item.action)}
            style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
          >
            <AppCard padding="md" style={styles.actionCard}>
              <View style={[styles.iconWrap, { backgroundColor: item.surface }]}>
                <Ionicons color={item.color} name={item.icon} size={20} />
              </View>
              <View style={styles.actionCopy}>
                <AppText variant="label">{item.label}</AppText>
                <AppText tone="subtle" variant="caption">{item.detail}</AppText>
              </View>
            </AppCard>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  headingRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: theme.spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md },
  action: {
    width: "47%",
    minWidth: 140,
    flexGrow: 1,
  },
  actionCard: { minHeight: 92, gap: theme.spacing.sm, justifyContent: "center", ...theme.shadows.card },
  iconWrap: { height: 36, width: 36, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center" },
  actionCopy: { gap: theme.spacing.xxs },
  pressed: { opacity: 0.86 },
});
