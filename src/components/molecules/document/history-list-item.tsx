import clsx from "clsx";
import type { ReactElement } from "react";
import { getSiteLabelFromUrl } from "@/lib/normalize-document-url";
import { formatHistoryListDate } from "@/lib/translation-history-date";
import type { TranslationHistoryItem } from "@/types/translation";

interface HistoryListItemProps {
  item: TranslationHistoryItem;
  isSelected: boolean;
  onSelect: (item: TranslationHistoryItem) => void;
}

export const HistoryListItem = ({
  item,
  isSelected,
  onSelect,
}: HistoryListItemProps): ReactElement => {
  const siteLabel = getSiteLabelFromUrl(item.url);

  const handleClick = (): void => {
    onSelect(item);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
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
      <span className="font-doc-aux hidden shrink-0 text-xs text-amber-800/75 sm:inline">
        {siteLabel}
      </span>
      <time
        dateTime={item.createdAt}
        className="font-doc-aux shrink-0 text-[0.65rem] text-amber-700/65"
      >
        {formatHistoryListDate(item.createdAt)}
      </time>
    </button>
  );
};
