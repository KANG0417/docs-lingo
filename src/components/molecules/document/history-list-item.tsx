import clsx from "clsx";
import type { MouseEvent, ReactElement } from "react";
import { getSiteLabelFromUrl } from "@/lib/document/normalize-document-url";
import { formatHistoryListDate } from "@/lib/translation/translation-history-date";
import type { TranslationHistoryItem } from "@/types/translation";

interface HistoryListItemProps {
  item: TranslationHistoryItem;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect: (item: TranslationHistoryItem) => void;
  onDelete: (item: TranslationHistoryItem) => void;
}

export const HistoryListItem = ({
  item,
  isSelected,
  isDeleting,
  onSelect,
  onDelete,
}: HistoryListItemProps): ReactElement => {
  const siteLabel = getSiteLabelFromUrl(item.url);

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
        disabled={isDeleting}
        className={clsx(
          "history-memo-item text-zinc-800",
          isSelected && "history-memo-item-selected",
        )}
      >
        <span
          aria-hidden="true"
          className="font-doc-aux shrink-0 text-[0.65rem] font-bold text-amber-700/55"
        >
          ·
        </span>
        <span className="font-doc-translation-bold min-w-0 flex-1 truncate text-sm">
          {item.title}
        </span>
        {item.url && (
          <span className="font-doc-aux hidden shrink-0 text-xs text-amber-800/75 sm:inline">
            {siteLabel}
          </span>
        )}
        <time
          dateTime={item.createdAt}
          className="font-doc-aux shrink-0 text-[0.65rem] text-amber-700/65"
        >
          {formatHistoryListDate(item.createdAt)}
        </time>
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
