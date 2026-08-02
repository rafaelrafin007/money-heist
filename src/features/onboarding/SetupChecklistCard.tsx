import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AppText } from "@/src/components/AppText";
import type { SetupChecklistItem } from "@/src/features/onboarding/setupChecklist";
import { theme } from "@/src/theme";

type SetupChecklistCardProps = {
  items: SetupChecklistItem[];
  onDismiss: () => void;
};

export function SetupChecklistCard({ items, onDismiss }: SetupChecklistCardProps) {
  const completedCount = items.filter((item) => item.isComplete).length;
  const nextItem = items.find((item) => !item.isComplete);

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="label">Finish setup</AppText>
          <AppText tone="subtle" variant="caption">
            {completedCount} of {items.length} complete
          </AppText>
        </View>
        <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.dismissButton}>
          <AppText tone="subtle" variant="caption">Hide</AppText>
        </Pressable>
      </View>

      <View style={styles.items}>
        {items.map((item) => (
          <Pressable
            accessibilityLabel={`${item.label}. ${item.isComplete ? "Complete" : "Not complete"}. ${item.detail}`}
            accessibilityRole="button"
            key={item.id}
            onPress={() => router.push(item.href as Href)}
            style={styles.itemRow}
          >
            <Ionicons
              color={item.isComplete ? theme.colors.success : theme.colors.textSubtle}
              name={item.isComplete ? "checkmark-circle" : "ellipse-outline"}
              size={22}
            />
            <View style={styles.itemCopy}>
              <AppText variant="label">{item.label}</AppText>
              <AppText tone="subtle" variant="caption">{item.detail}</AppText>
            </View>
          </Pressable>
        ))}
      </View>

      {nextItem ? (
        <AppButton onPress={() => router.push(nextItem.href as Href)} title={nextItem.label} />
      ) : (
        <AppButton onPress={onDismiss} title="Checklist complete" variant="secondary" />
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  dismissButton: {
    minHeight: 36,
    justifyContent: "center",
  },
  items: {
    gap: theme.spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  itemCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
});
