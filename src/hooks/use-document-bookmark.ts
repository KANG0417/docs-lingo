"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDocumentBookmark,
  getDocumentBookmarkStatus,
  removeDocumentBookmark,
} from "@/services/bookmark-client-service";

interface UseDocumentBookmarkParams {
  documentId: string;
  enabled: boolean;
}

interface UseDocumentBookmarkReturn {
  isBookmarked: boolean;
  isLoading: boolean;
  isToggling: boolean;
  errorMessage: string | null;
  toggleBookmark: () => Promise<void>;
}

export const useDocumentBookmark = ({
  documentId,
  enabled,
}: UseDocumentBookmarkParams): UseDocumentBookmarkReturn => {
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [isToggling, setIsToggling] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsBookmarked(false);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    let isCancelled = false;

    void (async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const status = await getDocumentBookmarkStatus(documentId);
        if (!isCancelled) {
          setIsBookmarked(status.isBookmarked);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "북마크 상태를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [documentId, enabled]);

  const toggleBookmark = useCallback(async (): Promise<void> => {
    if (!enabled || isToggling) {
      return;
    }

    setIsToggling(true);
    setErrorMessage(null);

    try {
      const status = isBookmarked
        ? await removeDocumentBookmark(documentId)
        : await addDocumentBookmark(documentId);

      setIsBookmarked(status.isBookmarked);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "북마크 처리에 실패했습니다.",
      );
    } finally {
      setIsToggling(false);
    }
  }, [documentId, enabled, isBookmarked, isToggling]);

  return {
    isBookmarked,
    isLoading,
    isToggling,
    errorMessage,
    toggleBookmark,
  };
};
