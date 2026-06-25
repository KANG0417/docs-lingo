import {
  BODY_SENTENCE_MIN_LENGTH,
  INTRO_LINE_MAX_LENGTH,
  MIN_PARAGRAPH_LENGTH,
  QUESTION_HEADING_MAX_LENGTH,
  QUESTION_HEADING_MAX_WORDS,
} from "@/constants/document-pipeline";
import { isOfficialDocNavNoise } from "@/lib/document-pipeline/official-doc-patterns";

interface LineContext {
  afterListIntro: boolean;
  afterListItem: boolean;
}

const normalizeLine = (line: string): string => {
  return line.replace(/[ \t]{2,}/g, " ").trim();
};

const normalizeParagraphBlock = (lines: string[]): string => {
  return lines.map(normalizeLine).filter(Boolean).join("\n").trim();
};

const countWords = (line: string): number => {
  return normalizeLine(line).split(/\s+/).filter(Boolean).length;
};

/**
 * 문단 분리 기준
 * 1. 인사/강조 한 줄: `!`로 끝나고 짧은 독립 줄 → 단독 문단
 * 2. 질문형 소제목: `?`로 끝나는 짧은 제목 줄 → 단독 문단
 * 3. 섹션 제목: Title Case 짧은 줄 → 새 문단 시작 (목록 소개 `:` 줄은 이어 붙임)
 * 4. 본문 문장 줄: `.`/`!`/`?`로 끝나는 완결 문장 줄 → 이전 완결 문장·소제목과 분리
 * 5. 목록 블록: `:` 소개 + 짧은 항목 + 후속 설명 → 한 문단 유지
 */
const isIntroLine = (line: string): boolean => {
  const trimmed = normalizeLine(line);

  return (
    trimmed.endsWith("!") &&
    trimmed.length <= INTRO_LINE_MAX_LENGTH &&
    countWords(trimmed) <= 18 &&
    !trimmed.endsWith("?")
  );
};

const isQuestionHeadingLine = (line: string): boolean => {
  const trimmed = normalizeLine(line);

  if (!trimmed.endsWith("?") || trimmed.length > QUESTION_HEADING_MAX_LENGTH) {
    return false;
  }

  if ((trimmed.match(/\?/g) ?? []).length > 1) {
    return false;
  }

  return countWords(trimmed) <= QUESTION_HEADING_MAX_WORDS;
};

const isBodySentenceLine = (line: string): boolean => {
  const trimmed = normalizeLine(line);

  return (
    /[.!?]$/.test(trimmed) &&
    trimmed.length >= BODY_SENTENCE_MIN_LENGTH &&
    !trimmed.endsWith(":")
  );
};

const isHeadingLine = (line: string, context: LineContext): boolean => {
  const trimmed = normalizeLine(line);

  if (!trimmed || trimmed.length > 80) {
    return false;
  }

  if (isListItemLine(trimmed, context)) {
    return false;
  }

  if (isIntroLine(trimmed) || isQuestionHeadingLine(trimmed)) {
    return false;
  }

  if (/[.!?]$/.test(trimmed)) {
    return false;
  }

  if (/^#{1,6}\s/.test(trimmed)) {
    return true;
  }

  return /^[A-Z][\w'()-]*(?:\s+[A-Za-z][\w'()-]*){0,6}$/.test(trimmed);
};

const isListItemLine = (line: string, context: LineContext): boolean => {
  const trimmed = normalizeLine(line);

  if (!trimmed || trimmed.length > 48) {
    return false;
  }

  if (!context.afterListIntro && !context.afterListItem) {
    return false;
  }

  if (/[.!?:]$/.test(trimmed)) {
    return false;
  }

  const words = trimmed.split(/\s+/);

  if (words.length > 4) {
    return false;
  }

  return words.every(
    (word) => word.length <= 12 && /^[A-Za-z#+][\w#+.-]*$/.test(word),
  );
};

const endsWithListIntro = (lines: string[]): boolean => {
  const lastLine = lines[lines.length - 1] ?? "";
  return /:$/.test(normalizeLine(lastLine));
};

const containsListItems = (
  lines: string[],
  context: LineContext,
): boolean => {
  return lines.some((line) => isListItemLine(line, context));
};

const buildLineContext = (currentLines: string[]): LineContext => {
  const normalizedLines = currentLines.map(normalizeLine).filter(Boolean);

  return {
    afterListIntro: endsWithListIntro(normalizedLines),
    afterListItem: normalizedLines.some((line, index) => {
      const lineContext: LineContext = {
        afterListIntro:
          index > 0 && /:$/.test(normalizedLines[index - 1] ?? ""),
        afterListItem:
          index > 0 &&
          isListItemLine(normalizedLines[index - 1] ?? "", {
            afterListIntro:
              index > 1 && /:$/.test(normalizedLines[index - 2] ?? ""),
            afterListItem: false,
          }),
      };

      return isListItemLine(line, lineContext);
    }),
  };
};

const isStructuralParagraph = (paragraph: string): boolean => {
  const lines = paragraph.split("\n").map(normalizeLine).filter(Boolean);

  if (lines.length !== 1) {
    return false;
  }

  const line = lines[0] ?? "";
  const context: LineContext = {
    afterListIntro: false,
    afterListItem: false,
  };

  return (
    isIntroLine(line) ||
    isQuestionHeadingLine(line) ||
    isHeadingLine(line, context)
  );
};

const shouldStartNewParagraph = (
  currentLines: string[],
  nextLine: string,
): boolean => {
  if (currentLines.length === 0) {
    return false;
  }

  const lastLine = currentLines[currentLines.length - 1] ?? "";
  const context = buildLineContext(currentLines);

  if (isHeadingLine(nextLine, context)) {
    return true;
  }

  if (isQuestionHeadingLine(nextLine)) {
    return true;
  }

  if (isIntroLine(lastLine)) {
    return true;
  }

  if (isQuestionHeadingLine(lastLine)) {
    return true;
  }

  if (isHeadingLine(lastLine, context) && isBodySentenceLine(nextLine)) {
    return true;
  }

  if (isBodySentenceLine(lastLine) && isBodySentenceLine(nextLine)) {
    return true;
  }

  return false;
};

const shouldContinueSectionAfterBlankLine = (
  currentLines: string[],
  nextLine: string | undefined,
): boolean => {
  if (currentLines.length === 0 || !nextLine) {
    return false;
  }

  const context = buildLineContext(currentLines);

  if (context.afterListIntro && isListItemLine(nextLine, context)) {
    return true;
  }

  if (
    containsListItems(currentLines, context) &&
    !isHeadingLine(nextLine, context)
  ) {
    return true;
  }

  return false;
};

const flushParagraph = (
  lines: string[],
  paragraphs: string[],
): string[] => {
  const paragraph = normalizeParagraphBlock(lines);

  if (paragraph && isOfficialDocNavNoise(paragraph)) {
    return [];
  }

  if (
    paragraph.length >= MIN_PARAGRAPH_LENGTH ||
    isStructuralParagraph(paragraph)
  ) {
    paragraphs.push(paragraph);
  }

  return [];
};

const normalizeHeadingKey = (line: string): string => {
  return normalizeLine(line).toLowerCase();
};

const splitByLinkedSectionHeadings = (
  textContent: string,
  linkedHeadings: string[],
): string[] => {
  const headingKeys = new Set(
    linkedHeadings.map((heading) => normalizeHeadingKey(heading)),
  );

  if (headingKeys.size === 0) {
    return [];
  }

  const lines = textContent.split("\n");
  const sections: string[][] = [];
  let currentSection: string[] = [];

  const flushSection = (): void => {
    if (currentSection.length === 0) {
      return;
    }

    sections.push(currentSection);
    currentSection = [];
  };

  lines.forEach((line) => {
    const trimmedLine = normalizeLine(line);
    const isLinkedHeading =
      trimmedLine.length > 0 &&
      headingKeys.has(normalizeHeadingKey(trimmedLine));

    if (isLinkedHeading) {
      flushSection();
      currentSection.push(trimmedLine);
      return;
    }

    currentSection.push(trimmedLine ? trimmedLine : "");
  });

  flushSection();

  return sections
    .map((section) => section.join("\n").replace(/\n{3,}/g, "\n\n").trim())
    .filter(
      (paragraph) =>
        paragraph.length >= MIN_PARAGRAPH_LENGTH ||
        isStructuralParagraph(paragraph),
    );
};

const splitByLineStructure = (textContent: string): string[] => {
  const lines = textContent.split(/\n/);
  const paragraphs: string[] = [];
  let currentLines: string[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    const trimmedLine = normalizeLine(line);

    if (!trimmedLine) {
      const nextLine = lines
        .slice(lineIndex + 1)
        .map(normalizeLine)
        .find(Boolean);

      if (shouldContinueSectionAfterBlankLine(currentLines, nextLine)) {
        continue;
      }

      currentLines = flushParagraph(currentLines, paragraphs);
      continue;
    }

    if (shouldStartNewParagraph(currentLines, trimmedLine)) {
      currentLines = flushParagraph(currentLines, paragraphs);
    }

    currentLines.push(trimmedLine);
  }

  flushParagraph(currentLines, paragraphs);

  return paragraphs;
};

export const splitParagraphs = (
  textContent: string,
  linkedSectionHeadings: string[] = [],
): string[] => {
  const sectionParagraphs = splitByLinkedSectionHeadings(
    textContent,
    linkedSectionHeadings,
  );

  if (sectionParagraphs.length > 0) {
    return sectionParagraphs;
  }

  const structuredParagraphs = splitByLineStructure(textContent);

  if (structuredParagraphs.length > 0) {
    return structuredParagraphs;
  }

  return textContent
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[ \t]{2,}/g, " ").trim())
    .filter((paragraph) => paragraph.length >= MIN_PARAGRAPH_LENGTH);
};
