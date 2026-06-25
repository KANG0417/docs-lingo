import {
  ENABLE_IMPORTANCE_FILTER,
  IMPORTANCE_SCORE_THRESHOLD,
  MAX_AI_INPUT_LENGTH,
  MAX_PARAGRAPHS_FOR_AI,
} from "@/constants/document-pipeline";
import {
  isMarkdownAtxHeadingLine,
  isOfficialDocCalloutLine,
  isOfficialDocNavNoise,
} from "@/lib/document-pipeline/official-doc-patterns";
import type { RefinedParagraph } from "@/types/document-pipeline";

const NOISE_PATTERNS: RegExp[] = [
  /cookie/i,
  /subscribe/i,
  /sign up/i,
  /newsletter/i,
  /all rights reserved/i,
  /privacy policy/i,
  /terms of service/i,
  /skip to content/i,
  /table of contents/i,
  /join our community/i,
  /github discussions/i,
  /\bdiscord\b/i,
  /\breddit\b/i,
  /follow us on/i,
  /supported browsers/i,
  /screen reader/i,
  /voiceover/i,
];

const scoreParagraph = (paragraph: string): number => {
  let score = Math.min(paragraph.length / 120, 4);

  const firstLine = paragraph.split("\n")[0]?.trim() ?? "";

  if (
    isMarkdownAtxHeadingLine(firstLine) ||
    /^#{1,6}\s/.test(paragraph) ||
    /^[A-Z][^.!?]{0,80}$/.test(firstLine)
  ) {
    score += 2;
  }

  if (isOfficialDocCalloutLine(firstLine)) {
    score += 2.5;
  }

  if (
    /`[^`]+`/.test(paragraph) ||
    /\b(API|HTTP|SDK|CLI|JSON|TypeScript|React|Next\.js)\b/i.test(paragraph)
  ) {
    score += 2;
  }

  if (
    NOISE_PATTERNS.some((pattern) => pattern.test(paragraph)) ||
    isOfficialDocNavNoise(paragraph)
  ) {
    score -= 6;
  }

  if (paragraph.length < 40) {
    score -= 1;
  }

  return score;
};

const buildRefinedParagraphs = (
  paragraphs: string[],
): RefinedParagraph[] => {
  return paragraphs.map((text, index) => ({
    index: index + 1,
    text,
    score: scoreParagraph(text),
  }));
};

const capParagraphsByOrder = (
  paragraphs: RefinedParagraph[],
  maxParagraphs: number,
  maxLength: number,
): RefinedParagraph[] => {
  const selectedParagraphs: RefinedParagraph[] = [];
  let totalLength = 0;

  paragraphs.forEach((paragraph) => {
    if (selectedParagraphs.length >= maxParagraphs) {
      return;
    }

    if (totalLength + paragraph.text.length > maxLength) {
      return;
    }

    selectedParagraphs.push(paragraph);
    totalLength += paragraph.text.length;
  });

  return selectedParagraphs;
};

const selectByImportance = (
  paragraphs: RefinedParagraph[],
): RefinedParagraph[] => {
  const rankedParagraphs = [...paragraphs]
    .filter((paragraph) => paragraph.score > IMPORTANCE_SCORE_THRESHOLD)
    .sort((left, right) => right.score - left.score);

  const selectedParagraphs = capParagraphsByOrder(
    rankedParagraphs,
    MAX_PARAGRAPHS_FOR_AI,
    MAX_AI_INPUT_LENGTH,
  );

  if (selectedParagraphs.length > 0) {
    return selectedParagraphs.sort((left, right) => left.index - right.index);
  }

  return capParagraphsByOrder(
    paragraphs,
    MAX_PARAGRAPHS_FOR_AI,
    MAX_AI_INPUT_LENGTH,
  );
};

export const filterImportantParagraphs = (
  paragraphs: string[],
): RefinedParagraph[] => {
  const refinedParagraphs = buildRefinedParagraphs(paragraphs);

  if (!ENABLE_IMPORTANCE_FILTER) {
    return capParagraphsByOrder(
      refinedParagraphs,
      MAX_PARAGRAPHS_FOR_AI,
      MAX_AI_INPUT_LENGTH,
    );
  }

  return selectByImportance(refinedParagraphs);
};
