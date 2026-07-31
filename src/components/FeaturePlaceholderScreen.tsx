import { StyleSheet, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { theme } from "@/src/theme";

type FeaturePlaceholderScreenProps = {
  title: string;
  description: string;
};

export function FeaturePlaceholderScreen({ title, description }: FeaturePlaceholderScreenProps) {
  return (
    <AppScreen>
      <View style={styles.container}>
        <AppText tone="subtle" variant="label">
          Planned feature
        </AppText>
        <AppText variant="title">{title}</AppText>
        <AppText tone="subtle">{description}</AppText>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
});
