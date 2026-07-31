import { Text, type TextProps, StyleSheet } from "react-native";

import { theme } from "@/src/theme";

type AppTextVariant = "body" | "caption" | "label" | "title" | "headline" | "metric";
type AppTextTone = "default" | "muted" | "subtle" | "success" | "danger" | "inverse";

type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  tone?: AppTextTone;
  weight?: keyof typeof theme.typography.weights;
};

const toneStyles: Record<AppTextTone, { color: string }> = {
  default: { color: theme.colors.text },
  muted: { color: theme.colors.textMuted },
  subtle: { color: theme.colors.textSubtle },
  success: { color: theme.colors.success },
  danger: { color: theme.colors.danger },
  inverse: { color: theme.colors.inverseText },
};

export function AppText({
  variant = "body",
  tone = "default",
  weight,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        styles.base,
        styles[variant],
        toneStyles[tone],
        weight ? { fontWeight: theme.typography.weights[weight] } : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: theme.typography.family,
    letterSpacing: 0,
  },
  body: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
  },
  caption: {
    fontSize: theme.typography.sizes.xs,
    lineHeight: theme.typography.lineHeights.xs,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    lineHeight: theme.typography.lineHeights.xl,
    fontWeight: theme.typography.weights.bold,
  },
  headline: {
    fontSize: theme.typography.sizes.xxl,
    lineHeight: theme.typography.lineHeights.xxl,
    fontWeight: theme.typography.weights.bold,
  },
  metric: {
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
    fontWeight: theme.typography.weights.bold,
  },
});
