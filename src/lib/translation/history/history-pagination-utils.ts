import { HISTORY_PAGE_SIZE } from "@/constants/translation-history";

export const HISTORY_PAGE_BUTTON_WINDOW = 5;

export const getHistoryPageWindow = (
  currentPage: number,
  totalPages: number,
  windowSize: number = HISTORY_PAGE_BUTTON_WINDOW,
): number[] => {
  if (totalPages <= 0) {
    return [];
  }

  const safeWindowSize = Math.max(1, windowSize);
  let startPage = Math.max(1, currentPage - Math.floor(safeWindowSize / 2));
  let endPage = startPage + safeWindowSize - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - safeWindowSize + 1);
  }

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );
};

export const paginateHistoryItems = <TItem>(
  items: TItem[],
  page: number,
  pageSize: number = HISTORY_PAGE_SIZE,
): {
  items: TItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
} => {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const normalizedPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (normalizedPage - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    totalCount,
    totalPages,
    page: normalizedPage,
    pageSize,
  };
};
