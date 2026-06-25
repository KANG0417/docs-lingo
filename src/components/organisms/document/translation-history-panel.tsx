"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { HistoryDatePicker } from "@/components/molecules/document/history-date-picker";
import { HistoryListItem } from "@/components/molecules/document/history-list-item";
import { HistoryPagination } from "@/components/molecules/document/history-pagination";
import { HISTORY_PAGE_SIZE } from "@/constants/translation-history";
import { useTranslationHistory } from "@/hooks/use-translation-history";
import { getTranslationHistoryItem } from "@/services/translation-client-service";
import type {
  DocumentTranslationResult,
  TranslationHistoryItem,
} from "@/types/translation";

interface TranslationHistoryPanelProps {
  selectedTranslationId: string | null;
  onSelectHistory: (item: DocumentTranslationResult) => void;
  onDeletedTranslation?: (translationId: string) => void;
  refreshKey: number;
}

const toTranslationResult = (
  item: TranslationHistoryItem,
): DocumentTranslationResult => {
  return {
    id: item.id,
    documentId: item.documentId,
    title: item.title,
    fullTitle: item.fullTitle,
    url: item.url,
    originalContent: item.originalContent ?? "",
    translatedSummaryContent: item.translatedSummaryContent,
    translatedFullContent: item.translatedFullContent,
    translatedContent: item.translatedContent,
    summaryTerms: item.summaryTerms,
    documentImages: item.documentImages,
    documentCodeBlocks: item.documentCodeBlocks,
    documentType: item.documentType,
    warnings: item.warnings,
    createdAt: item.createdAt,
  };
};

export const TranslationHistoryPanel = ({
  selectedTranslationId,
  onSelectHistory,
  onDeletedTranslation,
  refreshKey,
}: TranslationHistoryPanelProps): ReactElement => {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const {
    historyResponse,
    historyDateKeys,
    selectedDateKey,
    currentPage,
    isLoading,
    deletingId,
    errorMessage,
    setSelectedDateKey,
    setCurrentPage,
    deleteHistoryItem,
  } = useTranslationHistory(refreshKey);

  const handleSelect = (item: TranslationHistoryItem): void => {
    setLoadingItemId(item.id);

    void (async (): Promise<void> => {
      try {
        const fullItem = await getTranslationHistoryItem(item.id);
        onSelectHistory(toTranslationResult(fullItem));
      } catch (error) {
        console.error("[TranslationHistoryPanel] select", error);
        onSelectHistory(toTranslationResult(item));
      } finally {
        setLoadingItemId(null);
      }
    })();
  };

  const handleDelete = async (item: TranslationHistoryItem): Promise<void> => {
    const isDeleted = await deleteHistoryItem(item.id);

    if (isDeleted) {
      onDeletedTranslation?.(item.id);
    }
  };

  const historyItems = historyResponse?.items ?? [];
  const totalPages = historyResponse?.totalPages ?? 1;
  const totalCount = historyResponse?.totalCount ?? 0;

  return (
    <aside
      aria-label="번역 히스토리"
      className="relative flex w-full min-w-0 shrink-0 flex-col lg:w-full"
    >
      <span
        aria-hidden="true"
        className="absolute -top-2.5 left-5 z-10 hidden h-5 w-14 -rotate-6 rounded-[2px] bg-violet-200/40 shadow-sm backdrop-blur-sm lg:block"
      />
      <span
        aria-hidden="true"
        className="absolute -top-2.5 right-5 z-10 hidden h-5 w-14 rotate-6 rounded-[2px] bg-indigo-200/40 shadow-sm backdrop-blur-sm lg:block"
      />

      <div className="history-memo-panel history-sidebar-panel memo-lines flex h-full min-h-0 flex-col rounded-sm border shadow-[4px_8px_24px_rgba(0,0,0,0.45)]">
        <header className="history-memo-header history-sidebar-header shrink-0 overflow-visible border-b border-dashed px-4 py-4">
          <h2 className="font-doc-title text-base font-bold text-amber-900">
            번역 히스토리
          </h2>
          <div className="mt-2">
            <p className="font-doc-aux text-xs font-semibold text-amber-800/80">
              날짜 선택
            </p>
            <HistoryDatePicker
              selectedDateKey={selectedDateKey}
              historyDateKeys={historyDateKeys}
              onDateKeyChange={setSelectedDateKey}
            />
          </div>
        </header>

        <div className="history-memo-list history-memo-margin memo-lines flex min-h-0 flex-1 flex-col">
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
            <ul className="history-memo-list-viewport">
              {historyItems.map((item) => (
                <li key={item.id}>
                  <HistoryListItem
                    item={item}
                    isSelected={selectedTranslationId === item.id}
                    isDeleting={deletingId === item.id}
                    isLoading={loadingItemId === item.id}
                    onSelect={handleSelect}
                    onDelete={(historyItem) => {
                      void handleDelete(historyItem);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {totalCount > HISTORY_PAGE_SIZE && (
          <HistoryPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </aside>
  );
};
