"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteTranslationHistoryItem,
  getTranslationHistory,
} from "@/services/translation-client-service";
import { getTranslationDayRange } from "@/lib/translation/translation-day-range";
import type { TranslationHistoryResponse } from "@/types/translation";

interface UseTranslationHistoryReturn {
  historyResponse: TranslationHistoryResponse | null;
  selectedDateKey: string;
  currentPage: number;
  isLoading: boolean;
  deletingId: string | null;
  errorMessage: string | null;
  setSelectedDateKey: (dateKey: string) => void;
  setCurrentPage: (page: number) => void;
  refreshHistory: () => Promise<void>;
  deleteHistoryItem: (translationId: string) => Promise<boolean>;
}

export const useTranslationHistory = (
  refreshKey = 0,
): UseTranslationHistoryReturn => {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(
    getTranslationDayRange().dateKey,
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [historyResponse, setHistoryResponse] =
    useState<TranslationHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory, refreshKey]);

  const deleteHistoryItem = useCallback(
    async (translationId: string): Promise<boolean> => {
      setDeletingId(translationId);
      setErrorMessage(null);

      try {
        await deleteTranslationHistoryItem(translationId);

        setHistoryResponse((previous) => {
          if (!previous) {
            return previous;
          }

          const nextItems = previous.items.filter(
            (item) => item.id !== translationId,
          );

          return {
            ...previous,
            items: nextItems,
            totalCount: Math.max(0, previous.totalCount - 1),
          };
        });

        try {
          const history = await getTranslationHistory({
            dateKey: selectedDateKey,
            page: currentPage,
          });

          if (history.items.length === 0 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
            return true;
          }

          setHistoryResponse(history);
        } catch (refreshError) {
          console.error("[deleteHistoryItem] refresh", refreshError);
        }

        return true;
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "번역 히스토리 삭제에 실패했습니다.",
        );
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [currentPage, selectedDateKey],
  );

  const handleSetSelectedDateKey = (dateKey: string): void => {
    setSelectedDateKey(dateKey);
    setCurrentPage(1);
  };

  return {
    historyResponse,
    selectedDateKey,
    currentPage,
    isLoading,
    deletingId,
    errorMessage,
    setSelectedDateKey: handleSetSelectedDateKey,
    setCurrentPage,
    refreshHistory,
    deleteHistoryItem,
  };
};
