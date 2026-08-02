import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";

import { theme } from "@/src/theme";

type AppCardProps = ViewProps & {
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  tone?: "default" | "muted" | "primary" | "success" | "warning" | "danger";
};

const paddingStyles: Record<NonNullable<AppCardProps["padding"]>, ViewStyle> = {
  none: { padding: 0 },
  sm: { padding: theme.spacing.sm },
  md: { padding: theme.spacing.md },
  lg: { padding: theme.spacing.lg },
};

const toneStyles: Record<NonNullable<AppCardProps["tone"]>, ViewStyle> = {
  default: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderSubtle,
  },
  muted: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderSubtle,
  },
  primary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  success: {
    backgroundColor: theme.colors.successSurface,
    borderColor: theme.colors.successSurface,
  },
  warning: {
    backgroundColor: theme.colors.warningSurface,
    borderColor: theme.colors.warningSurface,
  },
  danger: {
    backgroundColor: theme.colors.dangerSurface,
    borderColor: theme.colors.dangerSurface,
  },
};

export function AppCard({
  children,
  padding = "lg",
  tone = "default",
  style,
  ...props
}: AppCardProps) {
  return (
    <View {...props} style={[styles.base, toneStyles[tone], paddingStyles[padding], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
});
