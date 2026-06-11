"use client";

import { useState } from "react";
import {
  translateDocumentFromText,
  translateDocumentFromUrl,
} from "@/services/translation-client-service";
import type { DocInputMode } from "@/types/document";
import type { DocumentTranslationResult } from "@/types/translation";

interface UseDocumentReaderReturn {
  mode: DocInputMode;
  isLoading: boolean;
  translationResult: DocumentTranslationResult | null;
  errorMessage: string | null;
  changeMode: (mode: DocInputMode) => void;
  readFromUrl: (url: string) => Promise<void>;
  readFromText: (text: string) => Promise<void>;
  selectHistoryItem: (item: DocumentTranslationResult) => void;
}

export const useDocumentReader = (): UseDocumentReaderReturn => {
  const [mode, setMode] = useState<DocInputMode>("url");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [translationResult, setTranslationResult] =
    useState<DocumentTranslationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const changeMode = (nextMode: DocInputMode): void => {
    setMode(nextMode);
    setErrorMessage(null);
  };

  const readFromUrl = async (url: string): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    setTranslationResult(null);

    try {
      const result = await translateDocumentFromUrl(url);
      setTranslationResult(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "문서 번역 중 오류가 발생했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const readFromText = async (text: string): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    setTranslationResult(null);

    try {
      const result = await translateDocumentFromText(text);
      setTranslationResult(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "텍스트 번역 중 오류가 발생했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectHistoryItem = (item: DocumentTranslationResult): void => {
    setErrorMessage(null);
    setTranslationResult(item);
  };

  return {
    mode,
    isLoading,
    translationResult,
    errorMessage,
    changeMode,
    readFromUrl,
    readFromText,
    selectHistoryItem,
  };
};
