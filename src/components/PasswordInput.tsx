import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { AppTextInput } from "@/src/components/AppTextInput";
import { theme } from "@/src/theme";

type PasswordInputProps = Omit<React.ComponentProps<typeof AppTextInput>, "secureTextEntry" | "rightAccessory"> & {
  visible: boolean;
  onToggleVisible: () => void;
};

export function PasswordInput({ visible, onToggleVisible, ...props }: PasswordInputProps) {
  return (
    <AppTextInput
      autoCapitalize="none"
      autoCorrect={false}
      secureTextEntry={!visible}
      rightAccessory={
        <Pressable
          accessibilityLabel={visible ? "Hide password" : "Show password"}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onToggleVisible}
          style={styles.toggle}
        >
          <Ionicons
            color={theme.colors.textSubtle}
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={22}
          />
        </Pressable>
      }
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    minHeight: 32,
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
