const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignInValues = {
  email: string;
  password: string;
};

export type SignUpValues = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type ForgotPasswordValues = {
  email: string;
};

export type ResetPasswordValues = {
  password: string;
  confirmPassword: string;
};

export type FormErrors<TValues> = Partial<Record<keyof TValues, string>>;

export const passwordRequirements = [
  "At least 8 characters",
  "One uppercase letter",
  "One lowercase letter",
  "One number",
] as const;

export function validateEmail(email: string) {
  if (!email.trim()) {
    return "Email is required.";
  }

  if (!emailPattern.test(email.trim())) {
    return "Enter a valid email address.";
  }

  return undefined;
}

export function validatePasswordValue(password: string) {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include uppercase, lowercase and number characters.";
  }

  return undefined;
}

export function validateSignIn(values: SignInValues): FormErrors<SignInValues> {
  const errors: FormErrors<SignInValues> = {};
  const emailError = validateEmail(values.email);

  if (emailError) {
    errors.email = emailError;
  }

  if (!values.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

export function validateSignUp(values: SignUpValues): FormErrors<SignUpValues> {
  const errors: FormErrors<SignUpValues> = {};
  const emailError = validateEmail(values.email);
  const passwordError = validatePasswordValue(values.password);

  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (emailError) {
    errors.email = emailError;
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function validateForgotPassword(values: ForgotPasswordValues): FormErrors<ForgotPasswordValues> {
  const emailError = validateEmail(values.email);

  return emailError ? { email: emailError } : {};
}

export function validateResetPassword(values: ResetPasswordValues): FormErrors<ResetPasswordValues> {
  const errors: FormErrors<ResetPasswordValues> = {};
  const passwordError = validatePasswordValue(values.password);

  if (passwordError) {
    errors.password = passwordError;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function hasErrors<TValues>(errors: FormErrors<TValues>) {
  return Object.keys(errors).length > 0;
}
