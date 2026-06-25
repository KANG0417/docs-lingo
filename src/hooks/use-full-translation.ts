"use client";

import { useState } from "react";
import { fetchFullTranslation } from "@/services/translation-client-service";

interface UseFullTranslationReturn {
  content: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  ensureFullTranslation: (
    translationId: string,
    originalContent: string,
  ) => Promise<void>;
  reset: () => void;
}

export const useFullTranslation = (): UseFullTranslationReturn => {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ensureFullTranslation = async (
    translationId: string,
    originalContent: string,
  ): Promise<void> => {
    if (content || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await fetchFullTranslation(translationId, originalContent);
      setContent(result.translatedFullContent);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "전체 번역 중 오류가 발생했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const reset = (): void => {
    setContent(null);
    setErrorMessage(null);
  };

  return { content, isLoading, errorMessage, ensureFullTranslation, reset };
};
