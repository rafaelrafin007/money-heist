import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { theme } from "@/src/theme";

type TabIconName = React.ComponentProps<typeof Ionicons>["name"];

const tabs: Record<string, { title: string; icon: TabIconName }> = {
  dashboard: { title: "Home", icon: "home-outline" },
  transactions: { title: "Transactions", icon: "swap-horizontal-outline" },
  budgets: { title: "Budgets", icon: "pie-chart-outline" },
  savings: { title: "Savings", icon: "shield-checkmark-outline" },
  settings: { title: "Settings", icon: "settings-outline" },
};

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarLabelStyle: {
          fontSize: theme.typography.sizes.xs,
          fontWeight: theme.typography.weights.medium,
        },
        tabBarStyle: {
          borderTopColor: theme.colors.borderSubtle,
          backgroundColor: theme.colors.surface,
          minHeight: 62,
          paddingTop: theme.spacing.xs,
        },
      }}
    >
      {Object.entries(tabs).map(([name, options]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: options.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons color={color} name={options.icon} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
