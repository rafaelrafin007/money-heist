import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { SectionHeader } from "@/src/components/SectionHeader";
import { useOnboarding } from "@/src/features/onboarding/OnboardingProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { theme } from "@/src/theme";

export function SettingsScreen() {
  const { profile, signOut, user } = useAuth();
  const { showSetupChecklist } = useOnboarding();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const profileRows = [
    { label: "Full name", value: profile?.fullName ?? "Add your name" },
    { label: "Email", value: user?.email ?? "No email on file" },
  ];
  const preferenceRows = [
    { label: "Default currency", value: profile?.currencyCode ?? "BDT" },
    { label: "Time zone", value: profile?.timezone ?? "Asia/Dhaka" },
    { label: "Financial month", value: `Starts on day ${profile?.financialMonthStartDay ?? 1}` },
  ];

  function confirmSignOut() {
    if (isSigningOut) {
      return;
    }

    setStatusMessage(undefined);

    if (Platform.OS === "web") {
      const confirmed =
        typeof globalThis.confirm === "function"
          ? globalThis.confirm("Log out?\n\nYou will need to sign in again to access your finance data.")
          : true;

      if (confirmed) {
        void handleSignOut();
      }
      return;
    }

    Alert.alert("Log out?", "You will need to sign in again to access your finance data.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          void handleSignOut();
        },
      },
    ]);
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setStatusMessage(undefined);
    const result = await signOut();
    setIsSigningOut(false);

    if (!result.ok) {
      setStatusMessage(result.message);
      return;
    }

    router.replace("/sign-in");
  }

  return (
    <AppScreen scroll contentStyle={styles.screenContent}>
      <SectionHeader
        eyebrow="Profile and preferences"
        subtitle="Manage account details, money setup, and security actions."
        title="Settings"
      />

      <AppText style={styles.sectionTitle} variant="label">Profile</AppText>
      <AppCard padding="none" style={styles.card}>
        {profileRows.map((row) => (
          <View key={row.label} style={styles.row}>
            <AppText tone="subtle">{row.label}</AppText>
            <AppText variant="label">{row.value}</AppText>
          </View>
        ))}
      </AppCard>

      <AppText style={styles.sectionTitle} variant="label">Preferences</AppText>
      <AppCard padding="none" style={styles.card}>
        {preferenceRows.map((row) => (
          <View key={row.label} style={styles.row}>
            <AppText tone="subtle">{row.label}</AppText>
            <AppText variant="label">{row.value}</AppText>
          </View>
        ))}
      </AppCard>

      <AppCard style={styles.actionCard}>
        <AppText variant="label">Money setup</AppText>
        <SettingsAction icon="wallet-outline" label="Manage accounts" onPress={() => router.push("/accounts" as Href)} />
        <SettingsAction icon="pricetags-outline" label="Manage categories" onPress={() => router.push("/categories" as Href)} />
        <SettingsAction icon="pie-chart-outline" label="Manage budgets" onPress={() => router.push("/budgets" as Href)} />
        <SettingsAction icon="shield-checkmark-outline" label="Manage savings goals" onPress={() => router.push("/savings" as Href)} />
        <SettingsAction icon="calendar-outline" label="Monthly plan" onPress={() => router.push("/planning" as Href)} />
      </AppCard>

      <AppCard style={styles.actionCard}>
        <AppText variant="label">App guide</AppText>
        <SettingsAction icon="compass-outline" label="View onboarding" onPress={() => router.push("/onboarding?mode=replay" as Href)} />
        <SettingsAction icon="checkbox-outline" label="Show setup checklist" onPress={() => void showSetupChecklist()} />
      </AppCard>

      <AppCard style={styles.actionCard}>
        <AppText variant="label">Security</AppText>
        <AppText tone="subtle" variant="caption">
          Log out when you are done using this device.
        </AppText>
        {statusMessage ? (
          <AppText style={styles.errorNotice} tone="danger" variant="caption">
            {statusMessage}
          </AppText>
        ) : null}
        <AppButton
          accessibilityLabel="Log out of Money Heist"
          disabled={isSigningOut}
          loading={isSigningOut}
          onPress={confirmSignOut}
          style={styles.logoutButton}
          title="Log out"
          variant="secondary"
        />
      </AppCard>
    </AppScreen>
  );
}

function SettingsAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <AppButton
      icon={<Ionicons color={theme.colors.primary} name={icon} size={18} />}
      onPress={onPress}
      title={label}
      variant="secondary"
    />
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: theme.spacing.xxxl * 3,
  },
  card: {
    ...theme.shadows.card,
  },
  sectionTitle: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
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
    ...theme.shadows.card,
  },
  errorNotice: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerSurface,
  },
  logoutButton: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSurface,
  },
});
