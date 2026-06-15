import type { TranslationError } from "@/lib/translation/translation-errors";

export type GeminiRetryAction = "retry-same-model" | "next-model" | "abort";

export const isQuotaError = (message: string): boolean => {
  const loweredMessage = message.toLowerCase();

  return (
    loweredMessage.includes("quota") ||
    loweredMessage.includes("rate limit") ||
    loweredMessage.includes("resource exhausted") ||
    loweredMessage.includes("limit: 0")
  );
};

const isFatalGeminiError = (error: TranslationError): boolean => {
  return (
    error.code === "GEMINI_INVALID_API_KEY" ||
    error.code === "GEMINI_BILLING_DEPLETED" ||
    error.code === "GEMINI_NO_API_KEY"
  );
};

const isModelUnavailableError = (error: TranslationError): boolean => {
  const loweredMessage = error.originalMessage.toLowerCase();

  return (
    error.code === "GEMINI_MODEL_NOT_FOUND" ||
    loweredMessage.includes("no longer available") ||
    loweredMessage.includes("not found") ||
    loweredMessage.includes("is not supported")
  );
};

export const resolveGeminiRetryAction = (
  error: TranslationError,
  attempt: number,
  maxRetries: number,
): GeminiRetryAction => {
  if (isFatalGeminiError(error)) {
    return "abort";
  }

  if (isModelUnavailableError(error)) {
    return "next-model";
  }

  if (isQuotaError(error.originalMessage)) {
    if (attempt < maxRetries) {
      return "retry-same-model";
    }

    return "abort";
  }

  return "next-model";
};

export const parseRetryDelayMs = (message: string): number => {
  const match = message.match(/retry in ([\d.]+)s/i);

  if (!match) {
    return 3000;
  }

  return Math.ceil(Number(match[1]) * 1000) + 500;
};
