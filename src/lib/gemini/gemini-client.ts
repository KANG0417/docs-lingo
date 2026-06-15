import {
  GEMINI_MAX_RETRY_COUNT,
  GEMINI_TEMPERATURE,
} from "@/constants/gemini";
import {
  createInvalidGeminiApiKeyMessage,
  isValidGeminiApiKeyFormat,
} from "@/lib/gemini/gemini-api-key";
import { resolveAutoGeminiModels } from "@/lib/gemini/gemini-model-resolver";
import {
  isQuotaError,
  parseRetryDelayMs,
  resolveGeminiRetryAction,
} from "@/lib/gemini/gemini-retry-policy";
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

  if (!serverApiKey) {
    return null;
  }

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
          temperature: GEMINI_TEMPERATURE,
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

        const retryAction = resolveGeminiRetryAction(
          normalizedError,
          attempt,
          GEMINI_MAX_RETRY_COUNT,
        );

        if (retryAction === "abort") {
          throw normalizedError;
        }

        if (retryAction === "retry-same-model") {
          await sleep(parseRetryDelayMs(normalizedError.originalMessage));
          continue;
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
  try {
    return Boolean(resolveGeminiConfig(userCredentials));
  } catch {
    return false;
  }
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
