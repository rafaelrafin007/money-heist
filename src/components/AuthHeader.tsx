import { Ionicons } from "@expo/vector-icons";
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
      <View style={styles.brandMark}>
        <Ionicons color={theme.colors.success} name="shield-checkmark-outline" size={20} />
      </View>
      <View style={styles.eyebrowPill}>
        <AppText tone="success" variant="label">
          {eyebrow}
        </AppText>
      </View>
      <AppText style={styles.title} variant="headline">{title}</AppText>
      <AppText style={styles.subtitle} tone="subtle">{subtitle}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  brandMark: {
    height: 52,
    width: 52,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.successSurface,
  },
  eyebrowPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    maxWidth: 420,
    textAlign: "center",
  },
});
