import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, View } from "react-native";

import { AppText } from "@/src/components/AppText";
import { theme } from "@/src/theme";

type AppButtonVariant = "primary" | "secondary" | "ghost";

type AppButtonProps = PressableProps & {
  title: string;
  variant?: AppButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
};

export function AppButton({
  title,
  variant = "primary",
  loading = false,
  disabled,
  icon,
  style,
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const textTone = variant === "primary" ? "inverse" : "default";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        styles[variant],
        isDisabled ? styles.disabled : null,
        state.pressed && !isDisabled ? styles.pressed : null,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : theme.colors.primary} /> : icon}
        <AppText tone={textTone} variant="label">
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.88,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
});
