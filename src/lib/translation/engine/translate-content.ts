const ENGLISH_RATIO_THRESHOLD = 0.35;

const countEnglishChars = (text: string): number => {
  const matches = text.match(/[A-Za-z]/g);
  return matches?.length ?? 0;
};

export const needsTranslation = (text: string): boolean => {
  const trimmedText = text.trim();
  if (!trimmedText) return false;

  const englishChars = countEnglishChars(trimmedText);
  const totalChars = trimmedText.replace(/\s/g, "").length;

  if (totalChars === 0) return false;

  return englishChars / totalChars >= ENGLISH_RATIO_THRESHOLD;
};
