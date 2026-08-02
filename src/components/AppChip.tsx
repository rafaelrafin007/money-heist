import { Pressable, StyleSheet, type PressableProps, View } from "react-native";

import { AppText } from "@/src/components/AppText";
import { theme } from "@/src/theme";

type ChipTone = "default" | "success" | "danger" | "warning";

type AppChipProps = PressableProps & {
  label: string;
  active?: boolean;
  tone?: ChipTone;
  icon?: React.ReactNode;
};

const toneStyles: Record<ChipTone, { activeBackground: string; activeBorder: string }> = {
  default: { activeBackground: theme.colors.primary, activeBorder: theme.colors.primary },
  success: { activeBackground: theme.colors.success, activeBorder: theme.colors.success },
  danger: { activeBackground: theme.colors.danger, activeBorder: theme.colors.danger },
  warning: { activeBackground: theme.colors.warning, activeBorder: theme.colors.warning },
};

export function AppChip({
  label,
  active = false,
  disabled,
  tone = "default",
  icon,
  style,
  ...props
}: AppChipProps) {
  const palette = toneStyles[tone];
  const isDisabled = Boolean(disabled);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: isDisabled }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        active ? { backgroundColor: palette.activeBackground, borderColor: palette.activeBorder } : null,
        isDisabled ? styles.disabled : null,
        state.pressed && !isDisabled ? styles.pressed : null,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {icon}
        <AppText tone={active ? "inverse" : "default"} variant="caption">
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.86,
  },
});
