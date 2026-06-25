import Anthropic from "@anthropic-ai/sdk";
import {
  CLAUDE_MAX_OUTPUT_TOKENS,
  CLAUDE_MODEL,
  CLAUDE_TEMPERATURE,
} from "@/constants/claude";
import {
  createInvalidClaudeApiKeyMessage,
  isValidClaudeApiKeyFormat,
} from "@/lib/claude/claude-api-key";
import {
  normalizeClaudeError,
  TranslationError,
} from "@/lib/translation/translation-errors";
import type { UserAiCredentials } from "@/types/ai-settings";

export interface ClaudeClientConfig {
  apiKey: string;
}

interface GenerateClaudeOptions {
  userCredentials?: UserAiCredentials | null;
  /** 표준 JSON 스키마(lowercase type, additionalProperties:false) */
  responseSchema?: Record<string, unknown>;
  systemInstruction?: string;
  maxOutputTokens?: number;
}

const getServerClaudeApiKey = (): string | null => {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  return apiKey ? apiKey : null;
};

const createInvalidApiKeyError = (
  hasUserApiKey: boolean,
): TranslationError => {
  return new TranslationError(
    "CLAUDE_INVALID_API_KEY",
    createInvalidClaudeApiKeyMessage(hasUserApiKey),
    "Claude API key format is invalid",
  );
};

const resolveClaudeConfig = (
  userCredentials?: UserAiCredentials | null,
): ClaudeClientConfig | null => {
  if (userCredentials?.apiKey?.trim()) {
    const apiKey = userCredentials.apiKey.trim();

    if (!isValidClaudeApiKeyFormat(apiKey)) {
      throw createInvalidApiKeyError(true);
    }

    return { apiKey };
  }

  const serverApiKey = getServerClaudeApiKey();

  if (!serverApiKey) {
    return null;
  }

  if (!isValidClaudeApiKeyFormat(serverApiKey)) {
    throw createInvalidApiKeyError(false);
  }

  return { apiKey: serverApiKey };
};

export const isClaudeConfigured = (
  userCredentials?: UserAiCredentials | null,
): boolean => {
  try {
    return Boolean(resolveClaudeConfig(userCredentials));
  } catch {
    return false;
  }
};

const extractResponseText = (
  message: Anthropic.Message,
  hasUserApiKey: boolean,
): string => {
  let text: string | undefined;

  for (const block of message.content) {
    if (block.type === "text") {
      text = block.text.trim();
      break;
    }
  }

  if (!text) {
    throw normalizeClaudeError(
      new Error("Claude API에서 응답을 받지 못했습니다."),
      { hasUserApiKey },
    );
  }

  return text;
};

/**
 * 긴 입력·출력 요청에서 HTTP 타임아웃을 피하려고 항상 스트리밍으로 호출하고
 * finalMessage()로 완성된 응답만 받는다. 구조화 출력(JSON 스키마)도 스트리밍과
 * 함께 쓸 수 있다.
 */
const requestClaude = async (
  config: ClaudeClientConfig,
  prompt: string,
  options?: GenerateClaudeOptions,
): Promise<string> => {
  const hasUserApiKey = Boolean(options?.userCredentials?.apiKey);
  const client = new Anthropic({ apiKey: config.apiKey });

  try {
    const stream = client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: options?.maxOutputTokens ?? CLAUDE_MAX_OUTPUT_TOKENS,
      temperature: CLAUDE_TEMPERATURE,
      thinking: { type: "disabled" },
      output_config: {
        effort: "low",
        ...(options?.responseSchema
          ? { format: { type: "json_schema", schema: options.responseSchema } }
          : {}),
      },
      ...(options?.systemInstruction
        ? { system: options.systemInstruction }
        : {}),
      messages: [{ role: "user", content: prompt }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      throw normalizeClaudeError(
        new Error("Claude API가 안전 정책에 따라 응답을 거부했습니다."),
        { hasUserApiKey },
      );
    }

    return extractResponseText(message, hasUserApiKey);
  } catch (error) {
    if (error instanceof TranslationError) {
      throw error;
    }

    throw normalizeClaudeError(error, { hasUserApiKey });
  }
};

export const generateClaudeText = async (
  prompt: string,
  options?: GenerateClaudeOptions,
): Promise<string> => {
  const config = resolveClaudeConfig(options?.userCredentials);

  if (!config) {
    throw normalizeClaudeError(
      new Error("사용 가능한 Claude API 키가 없습니다."),
      { hasUserApiKey: false },
    );
  }

  return requestClaude(config, prompt, options);
};

const requestClaudeJsonOnce = async <T>(
  config: ClaudeClientConfig,
  prompt: string,
  options?: GenerateClaudeOptions,
): Promise<T> => {
  const text = await requestClaude(config, prompt, options);
  return JSON.parse(text) as T;
};

/**
 * 정상 응답이어도 드물게 잘린/깨진 JSON이 올 수 있다 — 곧바로 legacy/fallback
 * 단계로 넘어가면 품질이 크게 떨어지므로, 동일 요청을 한 번 더 재시도해
 * 결과 일관성을 우선 확보한다.
 */
export const generateClaudeJson = async <T>(
  prompt: string,
  options?: GenerateClaudeOptions,
): Promise<T> => {
  const config = resolveClaudeConfig(options?.userCredentials);

  if (!config) {
    throw normalizeClaudeError(
      new Error("사용 가능한 Claude API 키가 없습니다."),
      { hasUserApiKey: false },
    );
  }

  try {
    return await requestClaudeJsonOnce<T>(config, prompt, options);
  } catch (error) {
    if (error instanceof TranslationError) {
      throw error;
    }

    if (!(error instanceof SyntaxError)) {
      throw normalizeClaudeError(error, {
        hasUserApiKey: Boolean(options?.userCredentials?.apiKey),
      });
    }

    try {
      return await requestClaudeJsonOnce<T>(config, prompt, options);
    } catch (retryError) {
      if (retryError instanceof TranslationError) {
        throw retryError;
      }

      throw normalizeClaudeError(retryError, {
        hasUserApiKey: Boolean(options?.userCredentials?.apiKey),
      });
    }
  }
};
