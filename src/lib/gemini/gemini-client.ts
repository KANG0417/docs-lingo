import { GEMINI_MAX_RETRY_COUNT } from "@/constants/gemini";
import {
  createInvalidGeminiApiKeyMessage,
  isValidGeminiApiKeyFormat,
} from "@/lib/gemini/gemini-api-key";
import { resolveAutoGeminiModels } from "@/lib/gemini/gemini-model-resolver";
import {
  normalizeGeminiError,
  TranslationError,
} from "@/lib/translation/translation-errors";
import type { UserAiCredentials } from "@/types/ai-settings";

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    status?: string;
  };
}

export interface GeminiClientConfig {
  apiKey: string;
}

interface GenerateGeminiOptions {
  userCredentials?: UserAiCredentials | null;
  responseMimeType?: "application/json";
}

const getServerGeminiApiKey = (): string | null => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return apiKey ? apiKey : null;
};

const createInvalidApiKeyError = (
  hasUserApiKey: boolean,
): TranslationError => {
  return new TranslationError(
    "GEMINI_INVALID_API_KEY",
    createInvalidGeminiApiKeyMessage(hasUserApiKey),
    "Gemini API key format is invalid",
  );
};

const resolveGeminiConfig = (
  userCredentials?: UserAiCredentials | null,
): GeminiClientConfig | null => {
  if (userCredentials?.apiKey?.trim()) {
    const apiKey = userCredentials.apiKey.trim();

    if (!isValidGeminiApiKeyFormat(apiKey)) {
      throw createInvalidApiKeyError(true);
    }

    return { apiKey };
  }

  const serverApiKey = getServerGeminiApiKey();
  if (!serverApiKey) return null;

  if (!isValidGeminiApiKeyFormat(serverApiKey)) {
    throw createInvalidApiKeyError(false);
  }

  return { apiKey: serverApiKey };
};

const sleep = (milliseconds: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

const parseRetryDelayMs = (message: string): number => {
  const match = message.match(/retry in ([\d.]+)s/i);
  if (!match) return 3000;

  return Math.ceil(Number(match[1]) * 1000) + 500;
};

const isQuotaError = (message: string): boolean => {
  const loweredMessage = message.toLowerCase();
  return (
    loweredMessage.includes("quota") ||
    loweredMessage.includes("rate limit") ||
    loweredMessage.includes("resource exhausted") ||
    loweredMessage.includes("limit: 0")
  );
};

const shouldAbortAllModels = (error: TranslationError): boolean => {
  return (
    error.code === "GEMINI_INVALID_API_KEY" ||
    error.code === "GEMINI_BILLING_DEPLETED" ||
    error.code === "GEMINI_NO_API_KEY"
  );
};

const shouldTryNextModel = (error: TranslationError): boolean => {
  const loweredMessage = error.originalMessage.toLowerCase();

  return (
    error.code === "GEMINI_MODEL_NOT_FOUND" ||
    loweredMessage.includes("no longer available") ||
    loweredMessage.includes("not found") ||
    loweredMessage.includes("is not supported") ||
    isQuotaError(error.originalMessage)
  );
};

const requestGemini = async (
  config: GeminiClientConfig,
  model: string,
  prompt: string,
  options?: GenerateGeminiOptions,
): Promise<string> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          ...(options?.responseMimeType
            ? { responseMimeType: options.responseMimeType }
            : {}),
        },
      }),
    });
  } catch (error) {
    throw normalizeGeminiError(error, {
      hasUserApiKey: Boolean(options?.userCredentials?.apiKey),
    });
  }

  let data: GeminiGenerateContentResponse;

  try {
    data = (await response.json()) as GeminiGenerateContentResponse;
  } catch (error) {
    throw normalizeGeminiError(error, {
      hasUserApiKey: Boolean(options?.userCredentials?.apiKey),
    });
  }

  if (!response.ok) {
    throw normalizeGeminiError(
      new Error(data.error?.message ?? "Gemini API 호출에 실패했습니다."),
      {
        hasUserApiKey: Boolean(options?.userCredentials?.apiKey),
        statusCode: response.status,
      },
    );
  }

  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!generatedText) {
    throw normalizeGeminiError(
      new Error("Gemini API에서 응답을 받지 못했습니다."),
      {
        hasUserApiKey: Boolean(options?.userCredentials?.apiKey),
      },
    );
  }

  return generatedText;
};

const requestWithModelFallback = async (
  prompt: string,
  options?: GenerateGeminiOptions,
): Promise<string> => {
  const config = resolveGeminiConfig(options?.userCredentials);
  if (!config) {
    throw normalizeGeminiError(
      new Error("사용 가능한 Gemini API 키가 없습니다."),
      { hasUserApiKey: false },
    );
  }

  const models = await resolveAutoGeminiModels(config.apiKey);
  let lastError: TranslationError | null = null;
  let lastAttemptedModel: string | null = null;

  for (const model of models) {
    lastAttemptedModel = model;

    for (let attempt = 0; attempt <= GEMINI_MAX_RETRY_COUNT; attempt += 1) {
      try {
        return await requestGemini(config, model, prompt, options);
      } catch (error) {
        const normalizedError =
          error instanceof TranslationError
            ? error
            : normalizeGeminiError(error, {
                hasUserApiKey: Boolean(options?.userCredentials?.apiKey),
              });

        lastError = normalizedError;

        if (shouldAbortAllModels(normalizedError)) {
          throw normalizedError;
        }

        if (
          isQuotaError(normalizedError.originalMessage) &&
          attempt < GEMINI_MAX_RETRY_COUNT
        ) {
          await sleep(parseRetryDelayMs(normalizedError.originalMessage));
          continue;
        }

        if (shouldTryNextModel(normalizedError)) {
          break;
        }

        break;
      }
    }
  }

  throw (
    lastError ??
    normalizeGeminiError(
      new Error(
        lastAttemptedModel
          ? `사용 가능한 Gemini 모델이 없습니다. (마지막 시도: ${lastAttemptedModel})`
          : "사용 가능한 Gemini 모델이 없습니다.",
      ),
      {
        hasUserApiKey: Boolean(options?.userCredentials?.apiKey),
      },
    )
  );
};

export const isGeminiConfigured = (
  userCredentials?: UserAiCredentials | null,
): boolean => {
  return Boolean(resolveGeminiConfig(userCredentials));
};

export const generateGeminiText = async (
  prompt: string,
  options?: GenerateGeminiOptions,
): Promise<string> => {
  return requestWithModelFallback(prompt, options);
};

export const generateGeminiJson = async <T>(
  prompt: string,
  options?: GenerateGeminiOptions,
): Promise<T> => {
  try {
    const generatedText = await requestWithModelFallback(prompt, {
      ...options,
      responseMimeType: "application/json",
    });

    return JSON.parse(generatedText) as T;
  } catch (error) {
    if (error instanceof TranslationError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw normalizeGeminiError(error, {
        hasUserApiKey: Boolean(options?.userCredentials?.apiKey),
      });
    }

    throw normalizeGeminiError(error, {
      hasUserApiKey: Boolean(options?.userCredentials?.apiKey),
    });
  }
};
