"use client";

import clsx from "clsx";
import { useState } from "react";
import type { DragEvent, ReactElement } from "react";
import { BookmarkFolderIcon } from "@/components/atoms/icon/bookmark-folder-icon";
import { BookmarkPinnedFolderIcon } from "@/components/atoms/icon/bookmark-pinned-folder-icon";
import { BookmarkListItemRow } from "@/components/molecules/document/bookmark-list-item";
import { BOOKMARK_DRAG_DOCUMENT_ID_MIME } from "@/constants/bookmark";
import type { BookmarkListItem } from "@/types/bookmark";

interface BookmarkFolderDropZoneProps {
  folderId: string;
  folderName: string;
  isDefault?: boolean;
  items: BookmarkListItem[];
  isExpanded: boolean;
  selectedDocumentId: string | null;
  loadingDocumentId: string | null;
  movingDocumentId: string | null;
  draggingDocumentId: string | null;
  onToggle: () => void;
  onSelect: (item: BookmarkListItem) => void;
  onMove: (documentId: string, folderId: string) => void;
  onDragStart: (documentId: string) => void;
  onDragEnd: () => void;
}

export const BookmarkFolderDropZone = ({
  folderId,
  folderName,
  isDefault = false,
  items,
  isExpanded,
  selectedDocumentId,
  loadingDocumentId,
  movingDocumentId,
  draggingDocumentId,
  onToggle,
  onSelect,
  onMove,
  onDragStart,
  onDragEnd,
}: BookmarkFolderDropZoneProps): ReactElement => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const handleDragOver = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>): void => {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    setIsDragOver(false);

    const documentId = event.dataTransfer.getData(
      BOOKMARK_DRAG_DOCUMENT_ID_MIME,
    );

    if (!documentId) {
      return;
    }

    onMove(documentId, folderId);
  };

  const panelId = `bookmark-folder-panel-${folderId}`;

  return (
    <section
      aria-label={`${folderName} 폴더`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        "bookmark-folder-zone",
        isDragOver && "bookmark-folder-zone-active",
        !isExpanded && "bookmark-folder-zone-collapsed",
      )}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="bookmark-folder-zone-header"
      >
        <span
          aria-hidden="true"
          className={clsx(
            "bookmark-folder-zone-chevron",
            isExpanded && "bookmark-folder-zone-chevron-expanded",
          )}
        >
          ▶
        </span>
        {isDefault ? (
          <span
            title="기본 폴더"
            className="bookmark-folder-zone-icon-wrap bookmark-folder-zone-icon-wrap-pinned"
          >
            <BookmarkPinnedFolderIcon
              size={15}
              className="bookmark-folder-zone-icon bookmark-folder-zone-icon-pinned"
            />
          </span>
        ) : (
          <BookmarkFolderIcon size={15} className="bookmark-folder-zone-icon" />
        )}
        <span className="bookmark-folder-zone-title font-doc-translation-bold">
          {folderName}
        </span>
        <span className="bookmark-folder-zone-count font-doc-aux">
          {items.length}
        </span>
      </button>

      {isExpanded && (
        <div id={panelId} className="bookmark-folder-zone-body">
          {items.length === 0 ? (
            <p className="bookmark-folder-zone-empty font-doc-aux">
              {isDragOver
                ? "여기에 놓으면 이 폴더로 이동합니다"
                : "문서를 끌어다 놓으세요"}
            </p>
          ) : (
            <ul className="bookmark-folder-zone-list">
              {items.map((item) => (
                <li key={item.bookmarkId}>
                  <BookmarkListItemRow
                    item={item}
                    isSelected={selectedDocumentId === item.documentId}
                    isLoading={loadingDocumentId === item.documentId}
                    isMoving={movingDocumentId === item.documentId}
                    isDragging={draggingDocumentId === item.documentId}
                    onSelect={onSelect}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!isExpanded && isDragOver && (
        <p className="bookmark-folder-zone-drop-hint font-doc-aux">
          여기에 놓으면 이동합니다
        </p>
      )}
    </section>
  );
};
