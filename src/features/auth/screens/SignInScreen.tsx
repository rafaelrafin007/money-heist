import { Link, router } from "expo-router";
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
import { useAuth } from "@/src/providers/AuthProvider";
import {
  hasErrors,
  validateSignIn,
  type FormErrors,
  type SignInValues,
} from "@/src/features/auth/validation";
import { theme } from "@/src/theme";

const initialValues: SignInValues = {
  email: "",
  password: "",
};

export function SignInScreen() {
  const [values, setValues] = useState<SignInValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors<SignInValues>>({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, configurationError } = useAuth();

  function updateValue(field: keyof SignInValues, value: string) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setStatusMessage(undefined);
  }

  async function handleSubmit() {
    const nextErrors = validateSignIn(values);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(values.email, values.password);
    setIsSubmitting(false);

    if (!result.ok) {
      setStatusMessage(result.message);
      return;
    }

    router.replace("/");
  }

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AuthHeader
        title="Welcome back"
        subtitle="Sign in to continue to your personal finance workspace."
      />

      <AuthFormCard>
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

        <View style={styles.passwordBlock}>
          <PasswordInput
            autoComplete="current-password"
            error={errors.password}
            label="Password"
            onChangeText={(value) => updateValue("password", value)}
            onToggleVisible={() => setPasswordVisible((visible) => !visible)}
            placeholder="Enter your password"
            returnKeyType="done"
            textContentType="password"
            value={values.password}
            visible={passwordVisible}
          />
          <Link href="/forgot-password" style={styles.forgotLink}>
            Forgot password?
          </Link>
        </View>

        {configurationError ? (
          <AppText style={styles.errorNotice} tone="danger" variant="caption">
            {configurationError}
          </AppText>
        ) : null}

        {statusMessage ? (
          <AppText style={styles.notice} tone="subtle" variant="caption">
            {statusMessage}
          </AppText>
        ) : null}

        <AppButton disabled={Boolean(configurationError)} loading={isSubmitting} onPress={handleSubmit} title="Sign in" />

        <AuthFooterLink href="/sign-up" label="Create account" prompt="New to Money Heist?" />
      </AuthFormCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
  },
  passwordBlock: {
    gap: theme.spacing.xs,
  },
  forgotLink: {
    alignSelf: "flex-end",
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    lineHeight: theme.typography.lineHeights.sm,
  },
  notice: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceTint,
  },
  errorNotice: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerSurface,
  },
});
