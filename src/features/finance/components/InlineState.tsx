import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppText } from "@/src/components/AppText";
import { theme } from "@/src/theme";

type InlineStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function InlineState({ title, message, actionLabel, onAction }: InlineStateProps) {
  return (
    <View style={styles.container}>
      <AppText variant="label">{title}</AppText>
      <AppText tone="subtle" variant="caption">
        {message}
      </AppText>
      {actionLabel && onAction ? <AppButton onPress={onAction} title={actionLabel} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
});
