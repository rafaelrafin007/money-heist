import { StyleSheet, View } from "react-native";

import { AppText } from "@/src/components/AppText";
import { theme } from "@/src/theme";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ title, subtitle, eyebrow, action }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        {eyebrow ? (
          <AppText tone="subtle" variant="label">
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="title">{title}</AppText>
        {subtitle ? (
          <AppText tone="subtle" variant="caption">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  copy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  action: {
    flexShrink: 0,
  },
});
