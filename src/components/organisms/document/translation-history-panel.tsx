"use client";

import { useEffect } from "react";
import type { ReactElement } from "react";
import { HistoryAlbumCard } from "@/components/molecules/document/history-album-card";
import { useTranslationHistory } from "@/hooks/use-translation-history";
import type {
  DocumentTranslationResult,
  TranslationHistoryItem,
} from "@/types/translation";

interface TranslationHistoryPanelProps {
  selectedTranslationId: string | null;
  onSelectHistory: (item: DocumentTranslationResult) => void;
  refreshKey: number;
}

const toTranslationResult = (
  item: TranslationHistoryItem,
): DocumentTranslationResult => {
  return {
    id: item.id,
    documentId: item.documentId,
    title: item.title,
    url: item.url,
    originalContent: item.originalContent ?? "",
    translatedContent: item.translatedContent,
    summaryTerms: item.summaryTerms,
    createdAt: item.createdAt,
  };
};

export const TranslationHistoryPanel = ({
  selectedTranslationId,
  onSelectHistory,
  refreshKey,
}: TranslationHistoryPanelProps): ReactElement => {
  const { historyItems, isLoading, errorMessage, refreshHistory } =
    useTranslationHistory();

  useEffect(() => {
    void refreshHistory();
  }, [refreshKey, refreshHistory]);

  const handleSelect = (item: TranslationHistoryItem): void => {
    onSelectHistory(toTranslationResult(item));
  };

  return (
    <aside
      aria-label="번역 히스토리"
      className="relative w-full rotate-[0.4deg] lg:max-w-sm"
    >
      <span
        aria-hidden="true"
        className="absolute -top-3 right-8 z-10 h-6 w-20 -rotate-3 rounded-[2px] bg-violet-200/40 shadow-sm backdrop-blur-sm"
      />

      <div className="rounded-sm border border-amber-200 bg-amber-50 p-5 shadow-[4px_8px_24px_rgba(0,0,0,0.35)]">
        <header className="mb-4 border-b border-dashed border-amber-300 pb-3 text-center">
          <h2 className="text-lg font-bold text-amber-900">번역 히스토리</h2>
          <p className="mt-1 text-xs text-amber-700/70">
            앨범 형식으로 이전 문서를 확인하세요
          </p>
        </header>

        {isLoading && (
          <p className="py-8 text-center text-sm text-amber-700/70">
            히스토리를 불러오는 중...
          </p>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="rounded-md border border-dashed border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600"
          >
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && historyItems.length === 0 && (
          <p className="py-8 text-center text-sm text-amber-700/70">
            아직 번역한 문서가 없습니다.
          </p>
        )}

        {!isLoading && historyItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {historyItems.map((item) => (
              <HistoryAlbumCard
                key={item.id}
                item={item}
                isSelected={selectedTranslationId === item.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
