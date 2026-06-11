"use client";

import { useEffect } from "react";
import type { ReactElement } from "react";
import { HistoryDatePicker } from "@/components/molecules/document/history-date-picker";
import { HistoryListItem } from "@/components/molecules/document/history-list-item";
import { HistoryPagination } from "@/components/molecules/document/history-pagination";
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
  const {
    historyResponse,
    selectedDateKey,
    currentPage,
    isLoading,
    errorMessage,
    setSelectedDateKey,
    setCurrentPage,
    refreshHistory,
  } = useTranslationHistory();

  useEffect(() => {
    void refreshHistory();
  }, [refreshKey, refreshHistory]);

  const handleSelect = (item: TranslationHistoryItem): void => {
    onSelectHistory(toTranslationResult(item));
  };

  const historyItems = historyResponse?.items ?? [];
  const totalPages = historyResponse?.totalPages ?? 1;
  const totalCount = historyResponse?.totalCount ?? 0;

  return (
    <aside
      aria-label="번역 히스토리"
      className="relative flex h-full w-full shrink-0 flex-col transition-transform duration-300 lg:w-72 xl:w-80 lg:rotate-[0.5deg] lg:hover:rotate-0"
    >
      <span
        aria-hidden="true"
        className="absolute -top-2.5 left-5 z-10 hidden h-5 w-14 -rotate-6 rounded-[2px] bg-violet-200/40 shadow-sm backdrop-blur-sm lg:block"
      />
      <span
        aria-hidden="true"
        className="absolute -top-2.5 right-5 z-10 hidden h-5 w-14 rotate-6 rounded-[2px] bg-indigo-200/40 shadow-sm backdrop-blur-sm lg:block"
      />

      <div className="history-memo-panel memo-lines flex h-full flex-col overflow-hidden rounded-sm border border-amber-200 shadow-[4px_8px_24px_rgba(0,0,0,0.45)]">
        <header className="history-memo-header border-b border-dashed border-amber-300 px-4 py-4">
          <h2 className="font-doc-title text-base font-bold text-amber-900">
            번역 히스토리
          </h2>
          <div className="mt-2">
            <p className="font-doc-aux text-xs font-semibold text-amber-800/80">
              날짜 선택
              <span className="ml-1.5 font-normal text-amber-700/65">
                (최근3개월)
              </span>
            </p>
            <HistoryDatePicker
              selectedDateKey={selectedDateKey}
              onDateKeyChange={setSelectedDateKey}
            />
          </div>
        </header>

        <div className="history-memo-list history-memo-margin flex min-h-0 flex-1 flex-col">
          {isLoading && (
            <p className="font-doc-aux px-3 py-8 text-center text-sm text-amber-700/70">
              메모를 펼치는 중...
            </p>
          )}

          {errorMessage && (
            <p
              role="alert"
              className="font-doc-aux mx-3 mt-3 rounded-sm border border-dashed border-red-300 bg-red-50/90 px-3 py-2 text-xs text-red-600"
            >
              {errorMessage}
            </p>
          )}

          {!isLoading && !errorMessage && historyItems.length === 0 && (
            <p className="font-doc-aux px-3 py-8 text-center text-sm leading-relaxed text-amber-700/70">
              이 날짜에는 적어 둔 번역 기록이 없습니다.
            </p>
          )}

          {!isLoading && historyItems.length > 0 && (
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {historyItems.map((item) => (
                <li key={item.id}>
                  <HistoryListItem
                    item={item}
                    isSelected={selectedTranslationId === item.id}
                    onSelect={handleSelect}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <HistoryPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setCurrentPage}
        />
      </div>
    </aside>
  );
};
