export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIConfigurationError";
  }
}

export class AIProviderRequestError extends Error {
  constructor(
    readonly provider: string,
    message: string,
  ) {
    super(message);
    this.name = "AIProviderRequestError";
  }
}

export class AIResponseValidationError extends Error {
  constructor(
    readonly provider: string,
    message: string,
  ) {
    super(message);
    this.name = "AIResponseValidationError";
  }
}

export class AIFallbackError extends Error {
  constructor(
    readonly primaryError: Error,
    readonly fallbackError: Error,
  ) {
    super("Meal analysis failed with both configured AI providers.");
    this.name = "AIFallbackError";
  }
}

export function normalizeAIError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("An AI provider failed with a non-standard error.");
}
