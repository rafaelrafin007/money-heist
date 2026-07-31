import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { theme } from "@/src/theme";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      {children}
    </SafeAreaProvider>
  );
}
