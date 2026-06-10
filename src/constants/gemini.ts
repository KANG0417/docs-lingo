export const GEMINI_AUTO_MODEL_PRIORITY = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.5-flash",
] as const;

export const GEMINI_DEFAULT_MODEL = GEMINI_AUTO_MODEL_PRIORITY[0];

export const GEMINI_FALLBACK_MODELS = GEMINI_AUTO_MODEL_PRIORITY;

export const GEMINI_MAX_INPUT_LENGTH = 10000;

export const GEMINI_MAX_RETRY_COUNT = 2;
