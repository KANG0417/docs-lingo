import clsx from "clsx";
import type { DragEvent, ReactElement } from "react";
import { BOOKMARK_DRAG_DOCUMENT_ID_MIME } from "@/constants/bookmark";
import { formatHistoryListDate } from "@/lib/translation/translation-history-date";
import type { BookmarkListItem } from "@/types/bookmark";

interface BookmarkListItemRowProps {
  item: BookmarkListItem;
  isSelected: boolean;
  isLoading?: boolean;
  isMoving?: boolean;
  isDragging?: boolean;
  isDragDisabled?: boolean;
  onSelect: (item: BookmarkListItem) => void;
  onDragStart: (documentId: string) => void;
  onDragEnd: () => void;
}

const getBookmarkSiteAddress = (item: BookmarkListItem): string => {
  if (item.url) {
    return item.url;
  }

  return "직접 입력 텍스트";
};

export const BookmarkListItemRow = ({
  item,
  isSelected,
  isLoading = false,
  isMoving = false,
  isDragging = false,
  isDragDisabled = false,
  onSelect,
  onDragStart,
  onDragEnd,
}: BookmarkListItemRowProps): ReactElement => {
  const siteAddress = getBookmarkSiteAddress(item);

  const handleSelect = (): void => {
    onSelect(item);
  };

  const handleDragStart = (event: DragEvent<HTMLElement>): void => {
    event.dataTransfer.setData(BOOKMARK_DRAG_DOCUMENT_ID_MIME, item.documentId);
    event.dataTransfer.effectAllowed = "move";
    onDragStart(item.documentId);
  };

  const handleDragEnd = (): void => {
    onDragEnd();
  };

  return (
    <article
      draggable={!isLoading && !isMoving && !isDragDisabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={clsx(
        "bookmark-memo-item-row history-memo-item-row",
        isSelected && "history-memo-item-row-selected",
        isDragging && "bookmark-memo-item-row-dragging",
        isMoving && "bookmark-memo-item-row-moving",
      )}
    >
      <button
        type="button"
        onClick={handleSelect}
        disabled={isLoading || isMoving}
        className={clsx(
          "history-memo-item bookmark-memo-item",
          isSelected && "history-memo-item-selected",
        )}
      >
        <span
          aria-hidden="true"
          className="bookmark-memo-grip history-memo-item-bullet font-doc-aux shrink-0 font-bold text-amber-700/60"
          title="드래그해서 폴더로 이동"
        >
          ⠿
        </span>
        <span className="history-memo-item-body min-w-0 flex-1">
          <span className="history-memo-item-head">
            <span className="history-memo-item-title font-doc-translation-bold">
              {item.historySummary}
            </span>
            <time
              dateTime={item.bookmarkedAt}
              className="history-memo-item-time font-doc-aux"
            >
              {formatHistoryListDate(item.bookmarkedAt)}
            </time>
          </span>
          <span className="history-memo-item-url font-doc-aux">{siteAddress}</span>
        </span>
      </button>
    </article>
  );
};
