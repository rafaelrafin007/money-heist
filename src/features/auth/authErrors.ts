export function toSafeAuthErrorMessage(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes("app configuration")) {
    return getErrorMessage(error);
  }

  if (message.includes("invalid login") || message.includes("invalid credentials")) {
    return "The email or password is incorrect.";
  }

  if (message.includes("email not confirmed") || message.includes("not confirmed")) {
    return "Please verify your email before signing in.";
  }

  if (message.includes("already registered") || message.includes("already exists")) {
    return "An account may already exist for this email. Try signing in or resetting your password.";
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Please wait and try again.";
  }

  if (message.includes("password")) {
    return "The password could not be accepted. Check the requirements and try again.";
  }

  return "Authentication could not be completed. Please try again.";
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}
