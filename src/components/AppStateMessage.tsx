import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { theme } from "@/src/theme";

type AppStateMessageProps = {
  title: string;
  message: string;
  loading?: boolean;
};

export function AppStateMessage({ title, message, loading = false }: AppStateMessageProps) {
  return (
    <AppScreen contentStyle={styles.screen}>
      <View style={styles.card}>
        {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
        <AppText variant="title">{title}</AppText>
        <AppText tone="subtle" style={styles.message}>
          {message}
        </AppText>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
  },
  card: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
  },
  message: {
    textAlign: "center",
  },
});
