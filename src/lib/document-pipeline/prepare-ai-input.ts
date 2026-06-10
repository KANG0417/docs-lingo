import type { RefinedParagraph } from "@/types/document-pipeline";

export const buildOriginalContent = (
  paragraphs: RefinedParagraph[],
): string => {
  return paragraphs.map((paragraph) => paragraph.text).join("\n\n");
};

export const prepareAiInput = (
  title: string,
  paragraphs: RefinedParagraph[],
): string => {
  const paragraphBlocks = paragraphs
    .map(
      (paragraph) =>
        `[문단 ${paragraph.index} | 중요도 ${paragraph.score.toFixed(1)}]\n${paragraph.text}`,
    )
    .join("\n\n");

  return [
    "=== 정제된 기술 문서 ===",
    `제목: ${title}`,
    "설명: HTML 본문 추출 → 문단 분리 → 중요도 필터를 거친 텍스트입니다.",
    "",
    paragraphBlocks,
  ].join("\n");
};
