import type { ReactElement } from "react";

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
  const handlePrevious = (): void => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = (): void => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <nav
      aria-label="번역 히스토리 페이지"
      className="history-memo-pagination flex items-center justify-between gap-2 border-t border-dashed border-amber-300 px-3 py-3"
    >
      <button
        type="button"
        onClick={handlePrevious}
        disabled={currentPage <= 1}
        className="history-memo-pagination-btn"
      >
        이전
      </button>

      <p className="font-doc-aux text-xs text-amber-800/70">
        {totalCount === 0
          ? "0건"
          : `${currentPage} / ${totalPages} · 총 ${totalCount}건`}
      </p>

      <button
        type="button"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className="history-memo-pagination-btn"
      >
        다음
      </button>
    </nav>
  );
};
