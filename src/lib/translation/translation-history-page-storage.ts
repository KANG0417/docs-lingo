const HISTORY_PAGE_STORAGE_PREFIX = "translation-history-page:";

export const getHistoryPageStorageKey = (dateKey: string): string => {
  return `${HISTORY_PAGE_STORAGE_PREFIX}${dateKey}`;
};

export const readStoredHistoryPage = (dateKey: string): number => {
  if (typeof window === "undefined") {
    return 1;
  }

  const stored = sessionStorage.getItem(getHistoryPageStorageKey(dateKey));
  const page = Number.parseInt(stored ?? "1", 10);

  if (Number.isNaN(page) || page < 1) {
    return 1;
  }

  return page;
};

export const writeStoredHistoryPage = (dateKey: string, page: number): void => {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(getHistoryPageStorageKey(dateKey), String(page));
};
