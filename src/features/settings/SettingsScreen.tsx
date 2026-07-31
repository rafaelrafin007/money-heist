import { router, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { useSettingsOverview } from "@/src/features/finance/hooks";
import { useAuth } from "@/src/providers/AuthProvider";
import { theme } from "@/src/theme";

export function SettingsScreen() {
  const settings = useSettingsOverview();
  const { profile, signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const rows = [
    { label: "Currency", value: settings.currency },
    { label: "Financial month", value: settings.financialMonth },
    { label: "Authentication", value: user ? "Connected" : "Not connected" },
    { label: "Signed in as", value: user?.email ?? "Unavailable" },
    { label: "Profile", value: profile?.fullName ?? "Profile loading" },
    { label: "Finance data", value: settings.financeData },
    { label: "Cloud finance sync", value: settings.cloudFinanceSync },
  ];

  async function handleSignOut() {
    setIsSigningOut(true);
    setStatusMessage(undefined);
    const result = await signOut();
    setIsSigningOut(false);

    if (!result.ok) {
      setStatusMessage(result.message);
    }
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <AppText tone="subtle" variant="label">
          App status
        </AppText>
        <AppText variant="title">Settings</AppText>
      </View>

      <View style={styles.card}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <AppText tone="subtle">{row.label}</AppText>
            <AppText variant="label">{row.value}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.actionCard}>
        <AppText variant="label">Finance setup</AppText>
        <AppButton onPress={() => router.push("/accounts" as Href)} title="Manage accounts" variant="secondary" />
        <AppButton onPress={() => router.push("/categories" as Href)} title="Manage categories" variant="secondary" />
      </View>

      <View style={styles.actionCard}>
        <AppText variant="label">Session</AppText>
        <AppText tone="subtle" variant="caption">
          Signing out clears the Supabase session on this device. Demo finance data is not deleted.
        </AppText>
        {statusMessage ? (
          <AppText style={styles.errorNotice} tone="danger" variant="caption">
            {statusMessage}
          </AppText>
        ) : null}
        <AppButton loading={isSigningOut} onPress={handleSignOut} title="Sign out" variant="secondary" />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.xxs,
    marginBottom: theme.spacing.lg,
  },
  card: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  actionCard: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  errorNotice: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerSurface,
  },
});
