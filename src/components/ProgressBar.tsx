import { StyleSheet, View } from "react-native";

import { theme } from "@/src/theme";

type ProgressBarProps = {
  value: number;
  tone?: "success" | "warning" | "danger" | "primary";
};

const fillColor = {
  success: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.danger,
  primary: theme.colors.primaryMuted,
};

export function ProgressBar({ value, tone = "success" }: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: clampedValue }} style={styles.track}>
      <View style={[styles.fill, { width: `${clampedValue}%`, backgroundColor: fillColor[tone] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: theme.radius.pill,
  },
});
