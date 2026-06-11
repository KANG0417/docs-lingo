"use client";

import { useCallback, useState } from "react";
import { getTranslationHistory } from "@/services/translation-client-service";
import { getTranslationDayRange } from "@/lib/translation-day-range";
import type { TranslationHistoryResponse } from "@/types/translation";

interface UseTranslationHistoryReturn {
  historyResponse: TranslationHistoryResponse | null;
  selectedDateKey: string;
  currentPage: number;
  isLoading: boolean;
  errorMessage: string | null;
  setSelectedDateKey: (dateKey: string) => void;
  setCurrentPage: (page: number) => void;
  refreshHistory: () => Promise<void>;
}

export const useTranslationHistory = (): UseTranslationHistoryReturn => {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(
    getTranslationDayRange().dateKey,
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [historyResponse, setHistoryResponse] =
    useState<TranslationHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshHistory = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const history = await getTranslationHistory({
        dateKey: selectedDateKey,
        page: currentPage,
      });
      setHistoryResponse(history);
    } catch (error) {
      setHistoryResponse(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "번역 히스토리를 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedDateKey]);

  const handleSetSelectedDateKey = (dateKey: string): void => {
    setSelectedDateKey(dateKey);
    setCurrentPage(1);
  };

  return {
    historyResponse,
    selectedDateKey,
    currentPage,
    isLoading,
    errorMessage,
    setSelectedDateKey: handleSetSelectedDateKey,
    setCurrentPage,
    refreshHistory,
  };
};
