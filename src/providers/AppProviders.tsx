import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/src/providers/AuthProvider";
import { theme } from "@/src/theme";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" backgroundColor={theme.colors.background} />
        {children}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
