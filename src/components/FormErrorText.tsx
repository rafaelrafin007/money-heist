import { StyleSheet } from "react-native";

import { AppText } from "@/src/components/AppText";
import { theme } from "@/src/theme";

type FormErrorTextProps = {
  message?: string;
};

export function FormErrorText({ message }: FormErrorTextProps) {
  if (!message) {
    return null;
  }

  return (
    <AppText accessibilityRole="alert" style={styles.error} tone="danger" variant="caption">
      {message}
    </AppText>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: theme.spacing.xs,
  },
});
