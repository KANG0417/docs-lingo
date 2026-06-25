import { CLAUDE_FULL_TRANSLATION_MAX_OUTPUT_TOKENS } from "@/constants/claude";
import { generateClaudeText, isClaudeConfigured } from "@/lib/claude/claude-client";
import { mergeTranslatedFullChunks } from "@/lib/document-pipeline/ai-input-chunks";
import {
  CLAUDE_FULL_TRANSLATION_SYSTEM_INSTRUCTION,
  buildClaudeFullTranslationUserPrompt,
} from "@/lib/translation/prompt/claude-full-translation-prompt";
import { normalizeTranslatedContent } from "@/lib/translation/document-ai-processor";
import { stripUnderlineEmphasis } from "@/lib/translation/markup/inline-markup-utils";
import {
  normalizeClaudeError,
  TranslationError,
} from "@/lib/translation/translation-errors";
import type { UserAiCredentials } from "@/types/ai-settings";

/**
 * 한국어 완전 번역은 원문과 거의 같은 분량의 텍스트를 그대로 출력해야 하고,
 * 한국어는 영어보다 토큰을 더 많이 쓴다. 청크를 너무 작게 쪼개면 모델이
 * 앞뒤 문맥(예: 문단 안의 '/' 같은 짧은 경로 참조)을 잃어버려 오역을
 * 만드는 것을 확인했으므로, 정말 긴 문서에 대해서만 나눈다.
 */
const FULL_TRANSLATION_CHUNK_THRESHOLD = 8000;
const FULL_TRANSLATION_MAX_CHUNK_LENGTH = 7000;

/**
 * 원문(original_content)을 문단 경계로 나눠 청크당 길이를 제한한다.
 * aiInput과 형식이 달라 splitAiInputIntoChunks(섹션 구분자 기반)는 쓸 수 없다.
 */
const splitOriginalContentIntoChunks = (text: string): string[] => {
  const trimmedText = text.trim();

  if (trimmedText.length <= FULL_TRANSLATION_CHUNK_THRESHOLD) {
    return [trimmedText];
  }

  const paragraphs = trimmedText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentParagraphs: string[] = [];
  let currentLength = 0;

  const flushChunk = (): void => {
    if (currentParagraphs.length === 0) {
      return;
    }

    chunks.push(currentParagraphs.join("\n\n"));
    currentParagraphs = [];
    currentLength = 0;
  };

  paragraphs.forEach((paragraph) => {
    const nextLength =
      currentLength + (currentParagraphs.length > 0 ? 2 : 0) + paragraph.length;

    if (
      nextLength > FULL_TRANSLATION_MAX_CHUNK_LENGTH &&
      currentParagraphs.length > 0
    ) {
      flushChunk();
    }

    currentParagraphs.push(paragraph);
    currentLength =
      currentParagraphs.length === 1
        ? paragraph.length
        : currentLength + 2 + paragraph.length;
  });

  flushChunk();

  return chunks.length > 0 ? chunks : [trimmedText];
};

const translateChunkWithClaude = async (
  chunkText: string,
  chunkIndex: number,
  totalChunks: number,
  userCredentials?: UserAiCredentials | null,
): Promise<string> => {
  const prompt = buildClaudeFullTranslationUserPrompt({
    chunkText,
    chunkIndex,
    totalChunks,
  });

  const translatedContent = (
    await generateClaudeText(prompt, {
      userCredentials,
      systemInstruction: CLAUDE_FULL_TRANSLATION_SYSTEM_INSTRUCTION,
      maxOutputTokens: CLAUDE_FULL_TRANSLATION_MAX_OUTPUT_TOKENS,
    })
  ).trim();

  if (!translatedContent) {
    throw normalizeClaudeError(
      new Error("Claude 전체 번역 결과가 비어 있습니다."),
      { hasUserApiKey: Boolean(userCredentials?.apiKey) },
    );
  }

  return translatedContent;
};

export const translateDocumentFullTextWithClaude = async (
  originalContent: string,
  userCredentials?: UserAiCredentials | null,
): Promise<string> => {
  if (!isClaudeConfigured(userCredentials)) {
    throw normalizeClaudeError(
      new Error("사용 가능한 Claude API 키가 없습니다."),
      { hasUserApiKey: Boolean(userCredentials?.apiKey) },
    );
  }

  const trimmedContent = originalContent.trim();

  if (!trimmedContent) {
    throw new TranslationError(
      "DOCUMENT_EMPTY",
      "번역할 본문을 찾지 못했습니다.",
      "empty originalContent",
    );
  }

  const chunks = splitOriginalContentIntoChunks(trimmedContent);
  const translatedChunks: string[] = [];

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    translatedChunks.push(
      await translateChunkWithClaude(
        chunks[chunkIndex],
        chunkIndex,
        chunks.length,
        userCredentials,
      ),
    );
  }

  return stripUnderlineEmphasis(
    normalizeTranslatedContent(mergeTranslatedFullChunks(translatedChunks)),
  );
};
