import { Link, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/src/components/AppText";
import { theme } from "@/src/theme";

type AuthFooterLinkProps = {
  prompt: string;
  label: string;
  href: Href;
};

export function AuthFooterLink({ prompt, label, href }: AuthFooterLinkProps) {
  return (
    <View style={styles.container}>
      <AppText tone="subtle" variant="caption">
        {prompt}
      </AppText>
      <Link href={href} style={styles.link}>
        {label}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  link: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    lineHeight: theme.typography.lineHeights.sm,
  },
});
