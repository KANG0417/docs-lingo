import { needsTranslation } from "@/lib/translation/translate-content";

export const shouldPersistTranslation = (
  originalContent: string,
  translatedContent: string,
): boolean => {
  const trimmedOriginal = originalContent.trim();
  const trimmedTranslated = translatedContent.trim();

  if (!trimmedOriginal || !trimmedTranslated) {
    return false;
  }

  return needsTranslation(trimmedOriginal);
};
