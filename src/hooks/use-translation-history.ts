"use client";

import { useCallback, useEffect, useState } from "react";
import { HISTORY_PAGE_SIZE } from "@/constants/translation-history";
import {
  readStoredHistoryPage,
  writeStoredHistoryPage,
} from "@/lib/translation/history/translation-history-page-storage";
import { getTranslationDayRange } from "@/lib/translation/history/translation-day-range";
import {
  deleteTranslationHistoryItem,
  getTranslationHistory,
  getTranslationHistoryDateKeys,
} from "@/services/translation-client-service";
import type { TranslationHistoryResponse } from "@/types/translation";

interface UseTranslationHistoryReturn {
  historyResponse: TranslationHistoryResponse | null;
  historyDateKeys: string[];
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
  const [currentPage, setCurrentPage] = useState<number>(() =>
    readStoredHistoryPage(getTranslationDayRange().dateKey),
  );
  const [historyResponse, setHistoryResponse] =
    useState<TranslationHistoryResponse | null>(null);
  const [historyDateKeys, setHistoryDateKeys] = useState<string[]>([]);
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
        pageSize: HISTORY_PAGE_SIZE,
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

  const refreshHistoryDateKeys = useCallback(async (): Promise<void> => {
    try {
      const { dateKeys } = await getTranslationHistoryDateKeys();
      setHistoryDateKeys(dateKeys);
    } catch (error) {
      console.error("[refreshHistoryDateKeys]", error);
      setHistoryDateKeys([]);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory, refreshKey]);

  useEffect(() => {
    void refreshHistoryDateKeys();
  }, [refreshHistoryDateKeys, refreshKey]);

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
            pageSize: HISTORY_PAGE_SIZE,
          });

          if (history.items.length === 0 && currentPage > 1) {
            const previousPage = currentPage - 1;
            setCurrentPage(previousPage);
            writeStoredHistoryPage(selectedDateKey, previousPage);
            return true;
          }

          setHistoryResponse(history);
        } catch (refreshError) {
          console.error("[deleteHistoryItem] refresh", refreshError);
        }

        void refreshHistoryDateKeys();

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
    [currentPage, selectedDateKey, refreshHistoryDateKeys],
  );

  const handleSetSelectedDateKey = (dateKey: string): void => {
    setSelectedDateKey(dateKey);
    setCurrentPage(readStoredHistoryPage(dateKey));
  };

  const handleSetCurrentPage = (page: number): void => {
    setCurrentPage(page);
    writeStoredHistoryPage(selectedDateKey, page);
  };

  return {
    historyResponse,
    historyDateKeys,
    selectedDateKey,
    currentPage,
    isLoading,
    deletingId,
    errorMessage,
    setSelectedDateKey: handleSetSelectedDateKey,
    setCurrentPage: handleSetCurrentPage,
    refreshHistory,
    deleteHistoryItem,
  };
};
