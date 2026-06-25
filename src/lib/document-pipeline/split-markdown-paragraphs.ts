import {
  MIN_PARAGRAPH_LENGTH,
} from "@/constants/document-pipeline";
import {
  isMarkdownAtxHeadingLine,
  isOfficialDocCalloutLine,
  isOfficialDocNavNoise,
  normalizeMarkdownHeadingToPlain,
} from "@/lib/document-pipeline/official-doc-patterns";

const stripMarkdownFrontmatter = (markdown: string): string => {
  return markdown.replace(/^\uFEFF?---[\s\S]*?---\s*\n?/, "").trim();
};

const isStructuralMarkdownBlock = (block: string): boolean => {
  const firstLine = block.split("\n")[0]?.trim() ?? "";

  return (
    isMarkdownAtxHeadingLine(firstLine) ||
    isOfficialDocCalloutLine(firstLine) ||
    /^#{1,6}\s/.test(firstLine)
  );
};

const normalizeMarkdownBlock = (block: string): string => {
  const lines = block.split("\n").map((line) => line.trimEnd());
  const normalizedLines = lines.map((line) => {
    const trimmed = line.trim();

    if (isMarkdownAtxHeadingLine(trimmed)) {
      return normalizeMarkdownHeadingToPlain(trimmed);
    }

    return line;
  });

  return normalizedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

/**
 * 마크다운 원문을 공식 문서 표준 블록으로 분리한다.
 * - `#`~`###` 제목 → 단독 문단(제목)
 * - Note/Warning 콜아웃 → 단독 또는 연속 블록
 * - 빈 줄 → 문단 경계
 */
export const splitMarkdownParagraphs = (markdown: string): string[] => {
  const source = stripMarkdownFrontmatter(markdown);
  const lines = source.split(/\r?\n/);
  const paragraphs: string[] = [];
  let currentLines: string[] = [];

  const flush = (): void => {
    const block = currentLines.join("\n").trim();

    if (!block || isOfficialDocNavNoise(block)) {
      currentLines = [];
      return;
    }

    if (
      block.length >= MIN_PARAGRAPH_LENGTH ||
      isStructuralMarkdownBlock(block)
    ) {
      paragraphs.push(normalizeMarkdownBlock(block));
    }

    currentLines = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
      return;
    }

    if (isMarkdownAtxHeadingLine(trimmed)) {
      flush();
      paragraphs.push(normalizeMarkdownHeadingToPlain(trimmed));
      return;
    }

    if (isOfficialDocCalloutLine(trimmed) && currentLines.length > 0) {
      flush();
    }

    currentLines.push(line);
  });

  flush();

  return paragraphs;
};
