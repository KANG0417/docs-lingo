import {
  ENABLE_IMPORTANCE_FILTER,
  IMPORTANCE_SCORE_THRESHOLD,
  MAX_AI_INPUT_LENGTH,
  MAX_PARAGRAPHS_FOR_AI,
} from "@/constants/document-pipeline";
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
];

const scoreParagraph = (paragraph: string): number => {
  let score = Math.min(paragraph.length / 120, 4);

  if (/^#{1,6}\s/.test(paragraph) || /^[A-Z][^.!?]{0,80}$/.test(paragraph)) {
    score += 2;
  }

  if (
    /`[^`]+`/.test(paragraph) ||
    /\b(API|HTTP|SDK|CLI|JSON|TypeScript|React|Next\.js)\b/i.test(paragraph)
  ) {
    score += 2;
  }

  if (NOISE_PATTERNS.some((pattern) => pattern.test(paragraph))) {
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

const selectByImportance = (
  paragraphs: RefinedParagraph[],
): RefinedParagraph[] => {
  const rankedParagraphs = [...paragraphs]
    .filter((paragraph) => paragraph.score > IMPORTANCE_SCORE_THRESHOLD)
    .sort((left, right) => right.score - left.score);

  const selectedParagraphs: RefinedParagraph[] = [];
  let totalLength = 0;

  rankedParagraphs.forEach((paragraph) => {
    if (selectedParagraphs.length >= MAX_PARAGRAPHS_FOR_AI) {
      return;
    }

    if (totalLength + paragraph.text.length > MAX_AI_INPUT_LENGTH) {
      return;
    }

    selectedParagraphs.push(paragraph);
    totalLength += paragraph.text.length;
  });

  if (selectedParagraphs.length > 0) {
    return selectedParagraphs.sort((left, right) => left.index - right.index);
  }

  return paragraphs
    .slice(0, MAX_PARAGRAPHS_FOR_AI)
    .filter((paragraph) => paragraph.text.length <= MAX_AI_INPUT_LENGTH);
};

export const filterImportantParagraphs = (
  paragraphs: string[],
): RefinedParagraph[] => {
  const refinedParagraphs = buildRefinedParagraphs(paragraphs);

  if (!ENABLE_IMPORTANCE_FILTER) {
    return refinedParagraphs.slice(0, MAX_PARAGRAPHS_FOR_AI);
  }

  return selectByImportance(refinedParagraphs);
};
