import { StyleSheet, View } from "react-native";

import { theme } from "@/src/theme";

type AuthFormCardProps = {
  children: React.ReactNode;
};

export function AuthFormCard({ children }: AuthFormCardProps) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
});
