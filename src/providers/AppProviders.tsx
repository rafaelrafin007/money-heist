import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppErrorBoundary } from "@/src/components/AppErrorBoundary";
import { queryClient } from "@/src/lib/queryClient";
import { OnboardingProvider } from "@/src/features/onboarding/OnboardingProvider";
import { AuthProvider } from "@/src/providers/AuthProvider";
import { theme } from "@/src/theme";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <OnboardingProvider>
              <StatusBar style="dark" backgroundColor={theme.colors.background} />
              {children}
            </OnboardingProvider>
          </AuthProvider>
        </QueryClientProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
