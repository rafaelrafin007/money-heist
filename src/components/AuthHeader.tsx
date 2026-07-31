import { StyleSheet, View } from "react-native";

import { AppText } from "@/src/components/AppText";
import { theme } from "@/src/theme";

type AuthHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
};

export function AuthHeader({ eyebrow = "Money Heist", title, subtitle }: AuthHeaderProps) {
  return (
    <View style={styles.container}>
      <AppText tone="success" variant="label">
        {eyebrow}
      </AppText>
      <AppText variant="headline">{title}</AppText>
      <AppText tone="subtle">{subtitle}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
});
