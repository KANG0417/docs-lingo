import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { RefinedParagraph } from "@/types/document-pipeline";
import type { DocumentImage } from "@/types/document-image";
import {
  MAX_SUMMARY_AI_INPUT_LENGTH,
  MAX_SUMMARY_PARAGRAPHS,
} from "@/constants/document-pipeline";
import {
  formatSectionsAsContent,
  isSectionHeadingLine,
} from "@/lib/translation/markup/translation-section-utils";

interface DocumentSection {
  heading: string;
  bodyParagraphs: string[];
  sectionIndex: number;
  images: DocumentImage[];
  codeBlocks: DocumentCodeBlock[];
}

const normalizeSectionHeading = (heading: string): string => {
  return heading.replace(/^#{1,6}\s/, "").trim();
};

export const buildDocumentSections = (
  documentTitle: string,
  paragraphs: RefinedParagraph[],
  images: DocumentImage[] = [],
  codeBlocks: DocumentCodeBlock[] = [],
): DocumentSection[] => {
  const sections: DocumentSection[] = [];
  let currentHeading = documentTitle;
  let currentBodyParagraphs: string[] = [];
  let sectionIndex = 0;

  const flushSection = (): void => {
    if (currentBodyParagraphs.length === 0) {
      return;
    }

    sections.push({
      heading: currentHeading,
      bodyParagraphs: [...currentBodyParagraphs],
      sectionIndex,
      images: images.filter((image) => image.sectionIndex === sectionIndex),
      codeBlocks: codeBlocks.filter(
        (block) => block.sectionIndex === sectionIndex,
      ),
    });
    currentBodyParagraphs = [];
  };

  paragraphs.forEach(({ text }) => {
    const trimmedText = text.trim();
    const isHeading =
      isSectionHeadingLine(trimmedText) && !trimmedText.includes("\n");

    if (isHeading) {
      flushSection();
      sectionIndex += 1;
      currentHeading = normalizeSectionHeading(trimmedText);
      return;
    }

    currentBodyParagraphs.push(text);
  });

  flushSection();

  if (sections.length === 0 && paragraphs.length > 0) {
    sections.push({
      heading: documentTitle,
      bodyParagraphs: paragraphs.map((paragraph) => paragraph.text),
      sectionIndex: 0,
      images: images.filter((image) => image.sectionIndex === 0),
      codeBlocks: codeBlocks.filter((block) => block.sectionIndex === 0),
    });
  }

  return sections;
};

const formatImageBlock = (image: DocumentImage): string => {
  const altText = image.alt || image.caption || "diagram";

  return [
    `[문서 이미지 ${image.id}]`,
    `url: ${image.url}`,
    `alt: ${altText}`,
  ].join("\n");
};

const formatCodeBlock = (block: DocumentCodeBlock): string => {
  const variantLines = block.variants
    .filter((variant) => variant.code.trim())
    .map((variant) => {
      const label = variant.packageManager
        ? `[${variant.packageManager}]`
        : "[코드]";

      return `${label}\n${variant.code}`;
    });

  return [`[문서 코드 ${block.id}]`, ...variantLines].join("\n");
};

const formatSectionBlock = (section: DocumentSection): string => {
  const imageBlocks =
    section.images.length > 0
      ? ["[문서 이미지]", ...section.images.map(formatImageBlock)].join("\n")
      : "";

  const codeBlocks =
    section.codeBlocks.length > 0
      ? ["[문서 코드 블록]", ...section.codeBlocks.map(formatCodeBlock)].join(
          "\n\n",
        )
      : "";

  return [
    "--- 섹션 ---",
    `[섹션 제목] ${section.heading}`,
    imageBlocks,
    codeBlocks,
    "[원문 본문]",
    section.bodyParagraphs.join("\n\n"),
  ]
    .filter((line) => line.length > 0)
    .join("\n");
};

export const buildOriginalContent = (
  title: string,
  paragraphs: RefinedParagraph[],
  images: DocumentImage[] = [],
  codeBlocks: DocumentCodeBlock[] = [],
): string => {
  const sections = buildDocumentSections(title, paragraphs, images, codeBlocks);

  return formatSectionsAsContent(
    sections.map((section) => ({
      heading: section.heading,
      body: section.bodyParagraphs.join("\n\n"),
    })),
  );
};

export const prepareAiInput = (
  title: string,
  paragraphs: RefinedParagraph[],
  images: DocumentImage[] = [],
  codeBlocks: DocumentCodeBlock[] = [],
  extractionSource: "markdown" | "readability" = "readability",
): string => {
  const sections = buildDocumentSections(title, paragraphs, images, codeBlocks);
  const extractionLabel =
    extractionSource === "markdown"
      ? "마크다운 원문(.md) → 공식 문서 표준 섹션/콜아웃 패턴으로 분리"
      : "HTML Readability 추출 → 섹션 제목 기준으로 묶음";

  return [
    "=== 정제된 기술 문서 (섹션 단위) ===",
    `문서 제목: ${title}`,
    `설명: ${extractionLabel}`,
    "각 [섹션 제목]은 페이지의 큰 제목(h1/h2, ## 마크다운 제목) 또는 소제목입니다.",
    "[문서 코드 블록]의 명령어·코드는 원문 그대로 유지하고, 설명만 한국어로 번역하세요.",
    "",
    sections.map(formatSectionBlock).join("\n\n"),
  ].join("\n");
};

const capSummaryParagraphs = (
  paragraphs: RefinedParagraph[],
): RefinedParagraph[] => {
  const ranked = [...paragraphs].sort((left, right) => right.score - left.score);
  const selected: RefinedParagraph[] = [];
  let totalLength = 0;

  ranked.forEach((paragraph) => {
    if (selected.length >= MAX_SUMMARY_PARAGRAPHS) {
      return;
    }

    if (totalLength + paragraph.text.length > MAX_SUMMARY_AI_INPUT_LENGTH) {
      return;
    }

    selected.push(paragraph);
    totalLength += paragraph.text.length;
  });

  return selected.sort((left, right) => left.index - right.index);
};

/** 핵심요약 전용 — 중요도 상위 문단만 담은 AI 입력 */
export const prepareSummaryAiInput = (
  title: string,
  paragraphs: RefinedParagraph[],
  images: DocumentImage[] = [],
  codeBlocks: DocumentCodeBlock[] = [],
  extractionSource: "markdown" | "readability" = "readability",
): string => {
  return prepareAiInput(
    title,
    capSummaryParagraphs(paragraphs),
    images,
    codeBlocks,
    extractionSource,
  );
};
