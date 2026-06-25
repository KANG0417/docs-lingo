import { MAX_AI_INPUT_LENGTH } from "@/constants/document-pipeline";
import {
  generateClaudeJson,
  isClaudeConfigured,
} from "@/lib/claude/claude-client";
import {
  CLAUDE_TRANSLATION_RESPONSE_SCHEMA,
  CLAUDE_TRANSLATION_SYSTEM_INSTRUCTION,
  buildClaudeTranslationUserPrompt,
} from "@/lib/translation/prompt/claude-translation-prompt";
import { validateClaudeTranslationResponse } from "@/lib/translation/map-claude-translation-response";
import {
  TranslationError,
  normalizeClaudeError,
} from "@/lib/translation/translation-errors";
import type { UserAiCredentials } from "@/types/ai-settings";
import type {
  ClaudeDocumentTranslationRawResponse,
  ClaudeDocumentTranslationResponse,
  ClaudeTranslationRequest,
} from "@/types/claude-document-translation";

const MAX_CLAUDE_INPUT_CHARS = MAX_AI_INPUT_LENGTH;

const assertClaudeConfigured = (
  userCredentials?: UserAiCredentials | null,
): void => {
  if (!isClaudeConfigured(userCredentials)) {
    throw normalizeClaudeError(new Error("사용 가능한 Claude API 키가 없습니다."), {
      hasUserApiKey: Boolean(userCredentials?.apiKey),
    });
  }
};

const assertInputWithinLimit = (
  extractedText: string,
  userCredentials?: UserAiCredentials | null,
): void => {
  if (extractedText.length <= MAX_CLAUDE_INPUT_CHARS) {
    return;
  }

  throw new TranslationError(
    "CLAUDE_QUOTA_EXCEEDED",
    `문서가 너무 깁니다. (${extractedText.length.toLocaleString()}자)\n현재 최대 ${MAX_CLAUDE_INPUT_CHARS.toLocaleString()}자까지 지원합니다.\n더 짧은 페이지 URL을 시도하거나 텍스트를 나누어 입력해 주세요.`,
    `input length ${extractedText.length} exceeds ${MAX_CLAUDE_INPUT_CHARS}`,
  );
};

export const translateDocumentWithClaude = async (
  request: ClaudeTranslationRequest,
  userCredentials?: UserAiCredentials | null,
): Promise<ClaudeDocumentTranslationResponse> => {
  assertClaudeConfigured(userCredentials);
  assertInputWithinLimit(request.extractedText, userCredentials);

  if (!request.extractedText.trim()) {
    throw new TranslationError(
      "DOCUMENT_EMPTY",
      "번역할 본문을 찾지 못했습니다.\n다른 문서 URL을 시도해 주세요.",
      "empty extractedText",
    );
  }

  const userPrompt = buildClaudeTranslationUserPrompt(request);

  try {
    const rawResponse =
      await generateClaudeJson<ClaudeDocumentTranslationRawResponse>(userPrompt, {
        userCredentials,
        systemInstruction: CLAUDE_TRANSLATION_SYSTEM_INSTRUCTION,
        responseSchema: CLAUDE_TRANSLATION_RESPONSE_SCHEMA,
      });

    return validateClaudeTranslationResponse(rawResponse);
  } catch (error) {
    if (error instanceof TranslationError) {
      throw error;
    }

    throw normalizeClaudeError(error, {
      hasUserApiKey: Boolean(userCredentials?.apiKey),
    });
  }
};
