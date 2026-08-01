import { useState } from "react";
import { StyleSheet } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import { AuthHeader } from "@/src/components/AuthHeader";
import { AuthFooterLink } from "@/src/features/auth/components/AuthFooterLink";
import { AuthFormCard } from "@/src/features/auth/components/AuthFormCard";
import {
  hasErrors,
  validateForgotPassword,
  type ForgotPasswordValues,
  type FormErrors,
} from "@/src/features/auth/validation";
import { useAuth } from "@/src/providers/AuthProvider";
import { theme } from "@/src/theme";

const initialValues: ForgotPasswordValues = {
  email: "",
};

export function ForgotPasswordScreen() {
  const [values, setValues] = useState<ForgotPasswordValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors<ForgotPasswordValues>>({});
  const [statusMessage, setStatusMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestPasswordReset, configurationError } = useAuth();

  function updateEmail(email: string) {
    setValues({ email });
    setErrors({});
    setStatusMessage(undefined);
  }

  async function handleSubmit() {
    const nextErrors = validateForgotPassword(values);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      return;
    }

    setIsSubmitting(true);
    const result = await requestPasswordReset(values.email);
    setIsSubmitting(false);
    setStatusMessage(
      result.ok
        ? "If an account exists for that email, password reset instructions will be sent."
        : result.message,
    );
  }

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AuthHeader
        title="Reset your password"
        subtitle="Enter your email and we will send password reset instructions if an account exists."
      />

      <AuthFormCard>
        <AppTextInput
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          error={errors.email}
          keyboardType="email-address"
          label="Email"
          onChangeText={updateEmail}
          placeholder="you@example.com"
          returnKeyType="done"
          textContentType="emailAddress"
          value={values.email}
        />

        {configurationError ? (
          <AppText style={styles.errorNotice} tone="danger" variant="caption">
            {configurationError}
          </AppText>
        ) : null}

        {statusMessage ? (
          <AppText accessibilityLiveRegion="polite" style={styles.success} tone="success" variant="caption">
            {statusMessage}
          </AppText>
        ) : null}

        <AppButton
          disabled={Boolean(configurationError)}
          loading={isSubmitting}
          onPress={handleSubmit}
          title="Continue"
        />

        <AuthFooterLink href="/sign-in" label="Back to sign in" prompt="Remembered your password?" />
      </AuthFormCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
  },
  success: {
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
