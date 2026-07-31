import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AuthHeader } from "@/src/components/AuthHeader";
import { PasswordInput } from "@/src/components/PasswordInput";
import { AuthFormCard } from "@/src/features/auth/components/AuthFormCard";
import {
  hasErrors,
  passwordRequirements,
  validateResetPassword,
  type FormErrors,
  type ResetPasswordValues,
} from "@/src/features/auth/validation";
import { useAuth } from "@/src/providers/AuthProvider";
import { theme } from "@/src/theme";

const initialValues: ResetPasswordValues = {
  password: "",
  confirmPassword: "",
};

export function ResetPasswordScreen() {
  const [values, setValues] = useState<ResetPasswordValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors<ResetPasswordValues>>({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePassword, configurationError } = useAuth();

  function updateValue(field: keyof ResetPasswordValues, value: string) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setStatusMessage(undefined);
    setIsSuccess(false);
  }

  async function handleSubmit() {
    const nextErrors = validateResetPassword(values);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(values.password);
    setIsSubmitting(false);

    if (!result.ok) {
      setIsSuccess(false);
      setStatusMessage(result.message);
      return;
    }

    setIsSuccess(true);
    setStatusMessage("Your password has been updated. You can continue to Money Heist.");
  }

  return (
    <AppScreen scroll>
      <AuthHeader
        title="Choose a new password"
        subtitle="Use the reset link from your email, then set a new password here."
      />

      <AuthFormCard>
        <View style={styles.passwordGuidance}>
          <PasswordInput
            autoComplete="new-password"
            error={errors.password}
            label="New password"
            onChangeText={(value) => updateValue("password", value)}
            onToggleVisible={() => setPasswordVisible((visible) => !visible)}
            placeholder="Create a new password"
            textContentType="newPassword"
            value={values.password}
            visible={passwordVisible}
          />
          <View style={styles.requirements}>
            {passwordRequirements.map((requirement) => (
              <AppText key={requirement} tone="subtle" variant="caption">
                {requirement}
              </AppText>
            ))}
          </View>
        </View>

        <PasswordInput
          autoComplete="new-password"
          error={errors.confirmPassword}
          label="Confirm new password"
          onChangeText={(value) => updateValue("confirmPassword", value)}
          onToggleVisible={() => setConfirmPasswordVisible((visible) => !visible)}
          placeholder="Re-enter your new password"
          textContentType="newPassword"
          value={values.confirmPassword}
          visible={confirmPasswordVisible}
        />

        {configurationError ? (
          <AppText style={styles.errorNotice} tone="danger" variant="caption">
            {configurationError}
          </AppText>
        ) : null}

        {statusMessage ? (
          <AppText
            accessibilityLiveRegion="polite"
            style={isSuccess ? styles.successNotice : styles.errorNotice}
            tone={isSuccess ? "success" : "danger"}
            variant="caption"
          >
            {statusMessage}
          </AppText>
        ) : null}

        <AppButton
          disabled={Boolean(configurationError)}
          loading={isSubmitting}
          onPress={handleSubmit}
          title="Update password"
        />

        {isSuccess ? (
          <AppButton onPress={() => router.replace("/dashboard")} title="Continue" variant="secondary" />
        ) : null}
      </AuthFormCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  passwordGuidance: {
    gap: theme.spacing.sm,
  },
  requirements: {
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.xs,
  },
  successNotice: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.successSurface,
  },
  errorNotice: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerSurface,
  },
});
