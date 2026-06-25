import clsx from "clsx";
import type { ReactElement } from "react";
import { HISTORY_PAGE_SIZE } from "@/constants/translation-history";
import {
  getHistoryPageWindow,
  HISTORY_PAGE_BUTTON_WINDOW,
} from "@/lib/translation/history/history-pagination-utils";

interface HistoryPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export const HistoryPagination = ({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
}: HistoryPaginationProps): ReactElement => {
  const visiblePages = getHistoryPageWindow(
    currentPage,
    totalPages,
    HISTORY_PAGE_BUTTON_WINDOW,
  );
  const firstVisiblePage = visiblePages[0] ?? 1;
  const lastVisiblePage = visiblePages[visiblePages.length - 1] ?? totalPages;

  const handlePreviousPage = (): void => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = (): void => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePreviousWindow = (): void => {
    const targetPage = Math.max(1, firstVisiblePage - HISTORY_PAGE_BUTTON_WINDOW);
    onPageChange(targetPage);
  };

  const handleNextWindow = (): void => {
    const targetPage = Math.min(
      totalPages,
      lastVisiblePage + 1,
    );
    onPageChange(targetPage);
  };

  return (
    <nav
      aria-label="번역 히스토리 페이지"
      className="history-memo-pagination flex flex-col gap-2 border-t border-dashed border-amber-300 px-3 py-3"
    >
      <p className="font-doc-aux text-center text-[0.6875rem] text-amber-800/70">
        {totalCount === 0
          ? "0건"
          : `페이지당 ${HISTORY_PAGE_SIZE}건 · 총 ${totalCount}건`}
      </p>

      <div className="flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={handlePreviousPage}
          disabled={currentPage <= 1}
          className="history-memo-pagination-btn"
        >
          이전
        </button>

        {firstVisiblePage > 1 && (
          <button
            type="button"
            onClick={handlePreviousWindow}
            className="history-memo-pagination-btn history-memo-pagination-btn--compact"
            aria-label="이전 페이지 묶음"
          >
            …
          </button>
        )}

        <div className="flex items-center gap-1">
          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              aria-current={pageNumber === currentPage ? "page" : undefined}
              onClick={() => onPageChange(pageNumber)}
              className={clsx(
                "history-memo-pagination-page-btn",
                pageNumber === currentPage &&
                  "history-memo-pagination-page-btn-active",
              )}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        {lastVisiblePage < totalPages && (
          <button
            type="button"
            onClick={handleNextWindow}
            className="history-memo-pagination-btn history-memo-pagination-btn--compact"
            aria-label="다음 페이지 묶음"
          >
            …
          </button>
        )}

        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="history-memo-pagination-btn"
        >
          다음
        </button>
      </div>
    </nav>
  );
};
