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
import { theme } from "@/src/theme";

const initialValues: ForgotPasswordValues = {
  email: "",
};

export function ForgotPasswordScreen() {
  const [values, setValues] = useState<ForgotPasswordValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors<ForgotPasswordValues>>({});
  const [submittedEmail, setSubmittedEmail] = useState<string>();

  function updateEmail(email: string) {
    setValues({ email });
    setErrors({});
    setSubmittedEmail(undefined);
  }

  function handleSubmit() {
    const nextErrors = validateForgotPassword(values);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      return;
    }

    setSubmittedEmail(values.email.trim());
  }

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AuthHeader
        title="Reset your password"
        subtitle="Enter your email and we will prepare the password reset flow for Supabase Auth."
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

        {submittedEmail ? (
          <AppText accessibilityLiveRegion="polite" style={styles.success} tone="success" variant="caption">
            Password reset is not connected yet. A future Supabase flow will send instructions to{" "}
            {submittedEmail}.
          </AppText>
        ) : null}

        <AppButton onPress={handleSubmit} title="Continue" />

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
});
