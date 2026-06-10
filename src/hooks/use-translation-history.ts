"use client";

import { useCallback, useState } from "react";
import { getTranslationHistory } from "@/services/translation-client-service";
import type { TranslationHistoryItem } from "@/types/translation";

interface UseTranslationHistoryReturn {
  historyItems: TranslationHistoryItem[];
  isLoading: boolean;
  errorMessage: string | null;
  refreshHistory: () => Promise<void>;
}

export const useTranslationHistory = (): UseTranslationHistoryReturn => {
  const [historyItems, setHistoryItems] = useState<TranslationHistoryItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshHistory = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const history = await getTranslationHistory();
      setHistoryItems(history);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "번역 히스토리를 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    historyItems,
    isLoading,
    errorMessage,
    refreshHistory,
  };
};
