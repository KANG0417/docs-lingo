export const GEMINI_DEFAULT_MODEL = "gemini-2.0-flash-lite";

export const GEMINI_FALLBACK_MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
] as const;

export const GEMINI_MAX_INPUT_LENGTH = 10000;

export const GEMINI_MAX_RETRY_COUNT = 2;
