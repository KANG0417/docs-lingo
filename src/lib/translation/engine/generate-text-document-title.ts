import {
  generateClaudeJson,
  isClaudeConfigured,
} from "@/lib/claude/claude-client";
import type { UserAiCredentials } from "@/types/ai-settings";

const TEXT_TITLE_INPUT_MAX_LENGTH = 1200;
const TEXT_TITLE_MAX_LENGTH = 40;
const TEXT_TITLE_MIN_LENGTH = 2;
export const DEFAULT_TEXT_DOCUMENT_TITLE = "직접 입력한 텍스트";

interface TitleResponse {
  title?: string;
}

const normalizeGeneratedTitle = (raw: string): string | null => {
  const cleaned = raw
    .replace(/^["'「『]|["'」』]$/g, "")
    .replace(/^제목\s*[:：-]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < TEXT_TITLE_MIN_LENGTH) {
    return null;
  }

  if (cleaned.length <= TEXT_TITLE_MAX_LENGTH) {
    return cleaned;
  }

  return `${cleaned.slice(0, TEXT_TITLE_MAX_LENGTH - 1).trim()}…`;
};

const extractFirstSentence = (line: string): string => {
  const match = line.match(/^[^.!?。！？\n]{4,80}/);

  if (match?.[0]) {
    return match[0].trim();
  }

  return line.trim();
};

export const buildFallbackTextDocumentTitle = (text: string): string => {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return DEFAULT_TEXT_DOCUMENT_TITLE;
  }

  const firstLine = trimmedText
    .split(/\n+/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find((line) => line.length >= TEXT_TITLE_MIN_LENGTH);

  if (!firstLine) {
    return DEFAULT_TEXT_DOCUMENT_TITLE;
  }

  const candidate =
    firstLine.length <= TEXT_TITLE_MAX_LENGTH
      ? firstLine
      : extractFirstSentence(firstLine);

  const normalized = normalizeGeneratedTitle(candidate);

  return normalized ?? DEFAULT_TEXT_DOCUMENT_TITLE;
};

const buildTitlePrompt = (excerpt: string): string => {
  return `당신은 ChatGPT·Claude처럼 사용자가 붙여넣은 텍스트의 주제를 한눈에 알 수 있는 짧은 제목을 짓는 AI입니다.

아래 텍스트의 핵심 주제를 담은 **한국어 제목** 하나만 작성하세요.

규칙:
- 5~30자 권장, 최대 ${TEXT_TITLE_MAX_LENGTH}자
- 문장형·구어체 금지. 명사구·키워드 중심 (예: "Next.js App Router 설치", "React useEffect 정리")
- 따옴표, 마침표, "제목:" 같은 접두사 금지
- 텍스트에 없는 내용 추측 금지

<text>
${excerpt}
</text>

JSON만 출력:
{"title":"..."}`;
};

export const generateTextDocumentTitle = async (
  text: string,
  userCredentials?: UserAiCredentials | null,
): Promise<string> => {
  const trimmedText = text.trim();
  const fallbackTitle = buildFallbackTextDocumentTitle(trimmedText);

  if (!trimmedText) {
    return DEFAULT_TEXT_DOCUMENT_TITLE;
  }

  if (!isClaudeConfigured(userCredentials)) {
    return fallbackTitle;
  }

  const excerpt = trimmedText.slice(0, TEXT_TITLE_INPUT_MAX_LENGTH);

  try {
    const response = await generateClaudeJson<TitleResponse>(
      buildTitlePrompt(excerpt),
      { userCredentials },
    );
    const generatedTitle = response.title?.trim();

    if (!generatedTitle) {
      return fallbackTitle;
    }

    return normalizeGeneratedTitle(generatedTitle) ?? fallbackTitle;
  } catch {
    return fallbackTitle;
  }
};
