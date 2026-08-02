import { StyleSheet, View } from "react-native";

import { AppText } from "@/src/components/AppText";
import { theme } from "@/src/theme";

type MetricTone = "default" | "success" | "danger" | "warning" | "primary";

type MetricTileProps = {
  label: string;
  value: string;
  caption?: string;
  tone?: MetricTone;
  prominent?: boolean;
  icon?: React.ReactNode;
};

const toneMap: Record<MetricTone, { text: string; surface: string }> = {
  default: { text: theme.colors.text, surface: theme.colors.surfaceMuted },
  success: { text: theme.colors.success, surface: theme.colors.successSurface },
  danger: { text: theme.colors.danger, surface: theme.colors.dangerSurface },
  warning: { text: theme.colors.warning, surface: theme.colors.warningSurface },
  primary: { text: theme.colors.primary, surface: theme.colors.surfaceTint },
};

export function MetricTile({
  label,
  value,
  caption,
  tone = "default",
  prominent = false,
  icon,
}: MetricTileProps) {
  const palette = toneMap[tone];

  return (
    <View style={[styles.tile, prominent ? styles.prominent : null]}>
      <View style={[styles.iconWrap, { backgroundColor: palette.surface }]}>
        {icon ?? <View style={[styles.dot, { backgroundColor: palette.text }]} />}
      </View>
      <View style={styles.copy}>
        <AppText tone="subtle" variant="caption">
          {label}
        </AppText>
        <AppText style={{ color: palette.text }} variant={prominent ? "headline" : "metric"}>
          {value}
        </AppText>
        {caption ? (
          <AppText tone="subtle" variant="caption">
            {caption}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: "47%",
    minWidth: 150,
    flexGrow: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  prominent: {
    width: "100%",
    minWidth: "100%",
    padding: theme.spacing.lg,
  },
  iconWrap: {
    height: 32,
    width: 32,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    height: 10,
    width: 10,
    borderRadius: theme.radius.pill,
  },
  copy: {
    gap: theme.spacing.xxs,
  },
});
