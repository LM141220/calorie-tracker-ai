export function isMissingAuthSessionError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AuthSessionMissingError"
  );
}

export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const authError = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
  };
  const code =
    typeof authError.code === "string" ? authError.code.toLowerCase() : "";
  const message =
    typeof authError.message === "string"
      ? authError.message.toLowerCase()
      : "";

  return (
    code === "refresh_token_not_found" ||
    code === "invalid_refresh_token" ||
    (message.includes("refresh token") &&
      (message.includes("invalid") ||
        message.includes("not found") ||
        message.includes("expired") ||
        message.includes("already used")))
  );
}
