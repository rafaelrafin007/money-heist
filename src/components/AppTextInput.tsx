import { StyleSheet, TextInput, type TextInputProps, View, type ViewStyle } from "react-native";

import { AppText } from "@/src/components/AppText";
import { FormErrorText } from "@/src/components/FormErrorText";
import { theme } from "@/src/theme";

type AppTextInputProps = TextInputProps & {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
  rightAccessory?: React.ReactNode;
};

export function AppTextInput({
  label,
  error,
  containerStyle,
  rightAccessory,
  style,
  accessibilityLabel,
  ...props
}: AppTextInputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="label">{label}</AppText>
      <View style={[styles.inputShell, error ? styles.inputShellError : null]}>
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor={theme.colors.textDisabled}
          style={[styles.input, style]}
          {...props}
        />
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
      </View>
      <FormErrorText message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  inputShell: {
    minHeight: 52,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    backgroundColor: theme.colors.inputBackground,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
  },
  inputShellError: {
    borderColor: theme.colors.danger,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
    paddingVertical: theme.spacing.sm,
  },
  accessory: {
    marginLeft: theme.spacing.sm,
  },
});
