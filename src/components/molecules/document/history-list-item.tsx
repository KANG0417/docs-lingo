import clsx from "clsx";
import type { MouseEvent, ReactElement } from "react";
import { formatHistoryListDate } from "@/lib/translation/history/translation-history-date";
import type { TranslationHistoryItem } from "@/types/translation";

interface HistoryListItemProps {
  item: TranslationHistoryItem;
  isSelected: boolean;
  isDeleting: boolean;
  isLoading?: boolean;
  onSelect: (item: TranslationHistoryItem) => void;
  onDelete: (item: TranslationHistoryItem) => void;
}

const getHistorySiteAddress = (item: TranslationHistoryItem): string => {
  if (item.url) {
    return item.url;
  }

  return "직접 입력 텍스트";
};

export const HistoryListItem = ({
  item,
  isSelected,
  isDeleting,
  isLoading = false,
  onSelect,
  onDelete,
}: HistoryListItemProps): ReactElement => {
  const siteAddress = getHistorySiteAddress(item);

  const handleSelect = (): void => {
    onSelect(item);
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onDelete(item);
  };

  return (
    <article
      className={clsx(
        "history-memo-item-row",
        isSelected && "history-memo-item-row-selected",
      )}
    >
      <button
        type="button"
        onClick={handleSelect}
        disabled={isDeleting || isLoading}
        className={clsx(
          "history-memo-item",
          isSelected && "history-memo-item-selected",
        )}
      >
        <span aria-hidden="true" className="history-memo-item-bullet">
          •
        </span>
        <span className="history-memo-item-body min-w-0 flex-1">
          <span
            className="history-memo-item-summary font-doc-translation-bold"
            title={item.historySummary}
          >
            {item.historySummary}
          </span>
          <span
            className="history-memo-item-url font-doc-aux"
            title={siteAddress}
          >
            {siteAddress}
          </span>
          <time
            dateTime={item.createdAt}
            className="history-memo-item-date font-doc-aux"
          >
            {formatHistoryListDate(item.createdAt)}
          </time>
        </span>
      </button>
      <button
        type="button"
        aria-label={`"${item.title}" 번역 기록 삭제`}
        title="삭제"
        disabled={isDeleting}
        onClick={handleDelete}
        className="history-memo-delete-btn"
      >
        {isDeleting ? "…" : "×"}
      </button>
    </article>
  );
};
