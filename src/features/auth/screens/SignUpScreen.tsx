import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import { AuthHeader } from "@/src/components/AuthHeader";
import { PasswordInput } from "@/src/components/PasswordInput";
import { AuthFooterLink } from "@/src/features/auth/components/AuthFooterLink";
import { AuthFormCard } from "@/src/features/auth/components/AuthFormCard";
import {
  hasErrors,
  passwordRequirements,
  validateSignUp,
  type FormErrors,
  type SignUpValues,
} from "@/src/features/auth/validation";
import { theme } from "@/src/theme";

const initialValues: SignUpValues = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function SignUpScreen() {
  const [values, setValues] = useState<SignUpValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors<SignUpValues>>({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();

  function updateValue(field: keyof SignUpValues, value: string) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setStatusMessage(undefined);
  }

  function handleSubmit() {
    const nextErrors = validateSignUp(values);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      return;
    }

    setStatusMessage("Registration will be handled by Supabase Auth in a later phase.");
  }

  return (
    <AppScreen scroll>
      <AuthHeader
        title="Create your account"
        subtitle="Set up secure access before connecting financial data."
      />

      <AuthFormCard>
        <AppTextInput
          autoCapitalize="words"
          autoComplete="name"
          error={errors.fullName}
          label="Full name"
          onChangeText={(value) => updateValue("fullName", value)}
          placeholder="Your name"
          returnKeyType="next"
          textContentType="name"
          value={values.fullName}
        />

        <AppTextInput
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          error={errors.email}
          keyboardType="email-address"
          label="Email"
          onChangeText={(value) => updateValue("email", value)}
          placeholder="you@example.com"
          returnKeyType="next"
          textContentType="emailAddress"
          value={values.email}
        />

        <View style={styles.passwordGuidance}>
          <PasswordInput
            autoComplete="new-password"
            error={errors.password}
            label="Password"
            onChangeText={(value) => updateValue("password", value)}
            onToggleVisible={() => setPasswordVisible((visible) => !visible)}
            placeholder="Create a password"
            returnKeyType="next"
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
          label="Confirm password"
          onChangeText={(value) => updateValue("confirmPassword", value)}
          onToggleVisible={() => setConfirmPasswordVisible((visible) => !visible)}
          placeholder="Re-enter your password"
          returnKeyType="done"
          textContentType="newPassword"
          value={values.confirmPassword}
          visible={confirmPasswordVisible}
        />

        {statusMessage ? (
          <AppText style={styles.notice} tone="subtle" variant="caption">
            {statusMessage}
          </AppText>
        ) : null}

        <AppButton onPress={handleSubmit} title="Create account" />

        <AuthFooterLink href="/sign-in" label="Sign in" prompt="Already have an account?" />
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
  notice: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceTint,
  },
});
