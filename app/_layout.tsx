import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppStateMessage } from "@/src/components/AppStateMessage";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppProviders } from "@/src/providers/AppProviders";
import { useAuth } from "@/src/providers/AuthProvider";
import { theme } from "@/src/theme";

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const { isAuthenticated, isInitializing, profileError, signOut } = useAuth();

  if (isInitializing) {
    return (
      <AppStateMessage
        loading
        title="Securing your session"
        message="Money Heist is checking your Supabase session before loading the app."
      />
    );
  }

  if (isAuthenticated && profileError) {
    return (
      <AppScreen contentStyle={styles.profileErrorScreen}>
        <View style={styles.profileErrorCard}>
          <AppText variant="title">Profile unavailable</AppText>
          <AppText tone="subtle">{profileError}</AppText>
          <AppButton onPress={() => void signOut()} title="Sign out" variant="secondary" />
        </View>
      </AppScreen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="reset-password" />
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  profileErrorScreen: {
    justifyContent: "center",
  },
  profileErrorCard: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
});
