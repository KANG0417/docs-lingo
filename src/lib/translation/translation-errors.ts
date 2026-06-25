export type TranslationErrorCode =
  | "CLAUDE_NO_API_KEY"
  | "CLAUDE_INVALID_API_KEY"
  | "CLAUDE_BILLING_DEPLETED"
  | "CLAUDE_QUOTA_EXCEEDED"
  | "CLAUDE_MODEL_NOT_FOUND"
  | "CLAUDE_EMPTY_RESPONSE"
  | "CLAUDE_JSON_PARSE"
  | "CLAUDE_UNKNOWN"
  | "FALLBACK_NETWORK"
  | "FALLBACK_RATE_LIMIT"
  | "FALLBACK_QUOTA_EXCEEDED"
  | "FALLBACK_EMPTY_RESPONSE"
  | "FALLBACK_UNKNOWN"
  | "DOCUMENT_FETCH_FAILED"
  | "DOCUMENT_EMPTY"
  | "UNOFFICIAL_DOCUMENT"
  | "TRANSLATION_ALL_FAILED";

import Anthropic from "@anthropic-ai/sdk";
import { OFFICIAL_DOCUMENT_ONLY_MESSAGE } from "@/constants/official-document";

interface TranslationErrorContext {
  hasUserApiKey?: boolean;
  statusCode?: number;
}

const ANTHROPIC_KEY_GUIDE = ".env.local의 ANTHROPIC_API_KEY";

export class TranslationError extends Error {
  public readonly code: TranslationErrorCode;
  public readonly originalMessage: string;

  constructor(
    code: TranslationErrorCode,
    message: string,
    originalMessage: string,
  ) {
    super(message);
    this.name = "TranslationError";
    this.code = code;
    this.originalMessage = originalMessage;
  }
}

const isBillingDepletedMessage = (message: string): boolean => {
  const loweredMessage = message.toLowerCase();
  return (
    loweredMessage.includes("credit") ||
    loweredMessage.includes("billing") ||
    loweredMessage.includes("payment required")
  );
};

const createClaudeNoApiKeyError = (
  originalMessage: string,
): TranslationError => {
  return new TranslationError(
    "CLAUDE_NO_API_KEY",
    `AI API 키가 등록되지 않았습니다.\n${ANTHROPIC_KEY_GUIDE}에 Anthropic API 키를 설정해 주세요.`,
    originalMessage,
  );
};

const createClaudeInvalidApiKeyError = (
  originalMessage: string,
  hasUserApiKey: boolean,
): TranslationError => {
  return new TranslationError(
    "CLAUDE_INVALID_API_KEY",
    hasUserApiKey
      ? "등록한 AI API 키가 올바르지 않습니다.\nAnthropic Console(https://console.anthropic.com/settings/keys)에서 발급한 키인지 확인해 주세요."
      : `서버 AI API 키가 올바르지 않습니다.\n${ANTHROPIC_KEY_GUIDE} 값을 확인해 주세요.`,
    originalMessage,
  );
};

const createClaudeBillingDepletedError = (
  originalMessage: string,
  hasUserApiKey: boolean,
): TranslationError => {
  return new TranslationError(
    "CLAUDE_BILLING_DEPLETED",
    hasUserApiKey
      ? "등록한 AI API 키의 크레딧이 모두 소진되었습니다.\nAnthropic Console에서 결제 상태를 확인하거나 다른 API 키를 등록해 주세요."
      : `AI 번역 크레딧이 모두 소진되었습니다.\n${ANTHROPIC_KEY_GUIDE}에 유효한 Anthropic API 키를 설정해 주세요.`,
    originalMessage,
  );
};

const createClaudeQuotaError = (
  originalMessage: string,
  hasUserApiKey: boolean,
): TranslationError => {
  return new TranslationError(
    "CLAUDE_QUOTA_EXCEEDED",
    hasUserApiKey
      ? "AI 사용 한도를 초과했습니다.\n잠시 후 다시 시도해 주세요."
      : `AI 사용 한도를 초과했습니다.\n${ANTHROPIC_KEY_GUIDE}에 설정된 API 키 한도를 확인해 주세요.`,
    originalMessage,
  );
};

/**
 * Anthropic SDK는 HTTP 상태별로 타입이 분리된 예외 클래스를 던진다 — 메시지
 * 문자열 매칭보다 `instanceof` 분기가 더 정확하고 안정적이다.
 */
export const normalizeClaudeError = (
  error: unknown,
  context: TranslationErrorContext = {},
): TranslationError => {
  const hasUserApiKey = Boolean(context.hasUserApiKey);
  const originalMessage =
    error instanceof Error ? error.message : "Claude API 호출 실패";

  if (originalMessage.includes("사용 가능한 Claude API 키가 없습니다")) {
    return createClaudeNoApiKeyError(originalMessage);
  }

  if (error instanceof Anthropic.AuthenticationError) {
    return createClaudeInvalidApiKeyError(originalMessage, hasUserApiKey);
  }

  if (error instanceof Anthropic.PermissionDeniedError) {
    return isBillingDepletedMessage(originalMessage)
      ? createClaudeBillingDepletedError(originalMessage, hasUserApiKey)
      : createClaudeInvalidApiKeyError(originalMessage, hasUserApiKey);
  }

  if (error instanceof Anthropic.RateLimitError) {
    return createClaudeQuotaError(originalMessage, hasUserApiKey);
  }

  if (error instanceof Anthropic.NotFoundError) {
    return new TranslationError(
      "CLAUDE_MODEL_NOT_FOUND",
      "선택한 AI 모델을 사용할 수 없습니다.\n잠시 후 다시 시도해 주세요.",
      originalMessage,
    );
  }

  if (error instanceof Anthropic.BadRequestError) {
    if (isBillingDepletedMessage(originalMessage)) {
      return createClaudeBillingDepletedError(originalMessage, hasUserApiKey);
    }

    return new TranslationError(
      "CLAUDE_UNKNOWN",
      "AI 번역 요청을 처리하지 못했습니다.\n잠시 후 다시 시도해 주세요.",
      originalMessage,
    );
  }

  if (
    originalMessage.includes("응답을 받지 못했습니다") ||
    originalMessage.includes("안전 정책에 따라 응답을 거부")
  ) {
    return new TranslationError(
      "CLAUDE_EMPTY_RESPONSE",
      "AI에서 번역 결과를 받지 못했습니다.\n잠시 후 다시 시도해 주세요.",
      originalMessage,
    );
  }

  if (
    error instanceof SyntaxError ||
    originalMessage.includes("JSON") ||
    originalMessage.includes("Unexpected token")
  ) {
    return new TranslationError(
      "CLAUDE_JSON_PARSE",
      "AI 응답을 처리하지 못했습니다.\n잠시 후 다시 시도해 주세요.",
      originalMessage,
    );
  }

  if (error instanceof Anthropic.APIConnectionError) {
    return new TranslationError(
      "CLAUDE_UNKNOWN",
      "AI 서버에 연결하지 못했습니다.\n인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
      originalMessage,
    );
  }

  return new TranslationError(
    "CLAUDE_UNKNOWN",
    "AI 번역 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.",
    originalMessage,
  );
};

export const normalizeFallbackError = (
  error: unknown,
  statusCode?: number,
): TranslationError => {
  const originalMessage =
    error instanceof Error ? error.message : "대체 번역 API 호출 실패";

  if (
    originalMessage.includes("fetch failed") ||
    originalMessage.includes("network") ||
    originalMessage.includes("ECONNREFUSED") ||
    originalMessage.includes("ENOTFOUND")
  ) {
    return new TranslationError(
      "FALLBACK_NETWORK",
      "번역 서버에 연결하지 못했습니다.\n인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
      originalMessage,
    );
  }

  if (
    originalMessage.includes("MYMEMORY WARNING") ||
    originalMessage.includes("USED ALL AVAILABLE FREE TRANSLATIONS")
  ) {
    return new TranslationError(
      "FALLBACK_QUOTA_EXCEEDED",
      `무료 대체 번역 한도가 초과되었습니다.\n${ANTHROPIC_KEY_GUIDE}에 Anthropic API 키를 설정해 주세요.`,
      originalMessage,
    );
  }

  if (statusCode === 429) {
    return new TranslationError(
      "FALLBACK_RATE_LIMIT",
      "번역 요청이 너무 많습니다.\n잠시 후 다시 시도해 주세요.",
      originalMessage,
    );
  }

  if (originalMessage.includes("대체 번역 결과를 받지 못했습니다")) {
    return new TranslationError(
      "FALLBACK_EMPTY_RESPONSE",
      "번역 결과를 받지 못했습니다.\n잠시 후 다시 시도해 주세요.",
      originalMessage,
    );
  }

  if (statusCode && statusCode >= 500) {
    return new TranslationError(
      "FALLBACK_UNKNOWN",
      "번역 서버에 일시적인 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.",
      originalMessage,
    );
  }

  return new TranslationError(
    "FALLBACK_UNKNOWN",
    `번역에 실패했습니다.\n${ANTHROPIC_KEY_GUIDE}에 Anthropic API 키가 설정되어 있는지 확인해 보세요.`,
    originalMessage,
  );
};

const getPrimaryError = (
  claudeError: TranslationError | null,
  fallbackError: TranslationError,
): TranslationError => {
  if (!claudeError) {
    return fallbackError;
  }

  // Claude가 실패한 경우 MyMemory 폴백 메시지보다 Claude 원인을 우선 노출
  return claudeError;
};

export const combineTranslationErrors = (
  claudeError: TranslationError | null,
  fallbackError: TranslationError,
): TranslationError => {
  const primaryError = getPrimaryError(claudeError, fallbackError);

  return new TranslationError(
    "TRANSLATION_ALL_FAILED",
    primaryError.message,
    `${claudeError?.originalMessage ?? ""} | ${fallbackError.originalMessage}`,
  );
};

export const toTranslationError = (error: unknown): TranslationError => {
  if (error instanceof TranslationError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "번역에 실패했습니다.";

  if (message.includes(OFFICIAL_DOCUMENT_ONLY_MESSAGE.split("\n")[0] ?? "")) {
    return new TranslationError(
      "UNOFFICIAL_DOCUMENT",
      OFFICIAL_DOCUMENT_ONLY_MESSAGE,
      message,
    );
  }

  if (message.includes("문서를 가져오지 못했습니다")) {
    return new TranslationError(
      "DOCUMENT_FETCH_FAILED",
      "문서를 불러오지 못했습니다.\nURL이 올바른지 확인해 주세요.",
      message,
    );
  }

  if (message.includes("읽을 수 있는 텍스트를 찾지 못했습니다")) {
    return new TranslationError(
      "DOCUMENT_EMPTY",
      "문서에서 읽을 수 있는 내용을 찾지 못했습니다.\n다른 페이지를 시도해 보세요.",
      message,
    );
  }

  if (message.includes("문서를 읽는 중 오류")) {
    return new TranslationError(
      "DOCUMENT_FETCH_FAILED",
      "문서를 읽는 중 오류가 발생했습니다.\nURL을 확인한 뒤 다시 시도해 주세요.",
      message,
    );
  }

  return new TranslationError(
    "TRANSLATION_ALL_FAILED",
    "번역에 실패했습니다.\n잠시 후 다시 시도해 주세요.",
    message,
  );
};

export const getTranslationErrorStatus = (
  error: TranslationError,
): number => {
  switch (error.code) {
    case "CLAUDE_NO_API_KEY":
    case "CLAUDE_INVALID_API_KEY":
    case "CLAUDE_BILLING_DEPLETED":
      return 400;
    case "CLAUDE_QUOTA_EXCEEDED":
    case "FALLBACK_RATE_LIMIT":
    case "FALLBACK_QUOTA_EXCEEDED":
      return 429;
    case "DOCUMENT_FETCH_FAILED":
      return 502;
    case "DOCUMENT_EMPTY":
    case "UNOFFICIAL_DOCUMENT":
      return 400;
    case "TRANSLATION_ALL_FAILED":
      return 500;
    default:
      return 500;
  }
};
