"use client";

import clsx from "clsx";
import { useState } from "react";
import type { DragEvent, ReactElement } from "react";
import { BookmarkDefaultFolderIndicator } from "@/components/atoms/icon/bookmark-default-folder-indicator";
import { BookmarkFolderIcon } from "@/components/atoms/icon/bookmark-folder-icon";
import { BookmarkListItemRow } from "@/components/molecules/document/bookmark-list-item";
import {
  BOOKMARK_DEFAULT_STORAGE_NAME,
  BOOKMARK_DRAG_DOCUMENT_ID_MIME,
  BOOKMARK_PINNED_FOLDER_LABEL,
} from "@/constants/bookmark";
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
  const isDefaultStorage = folderName === BOOKMARK_DEFAULT_STORAGE_NAME;

  return (
    <section
      aria-label={`${folderName} 폴더`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        "bookmark-folder-zone",
        isDefault && "bookmark-folder-zone-pinned",
        isDefaultStorage && "bookmark-folder-zone-default-storage",
        isDefault && "bookmark-folder-zone-pinned-meteor",
        isDragOver && "bookmark-folder-zone-active",
        !isExpanded && "bookmark-folder-zone-collapsed",
      )}
    >
      {isDefault && (
        <div aria-hidden="true" className="bookmark-folder-zone-pinned-sky">
          <span className="bookmark-folder-zone-meteor bookmark-folder-zone-meteor--a" />
          <span className="bookmark-folder-zone-meteor bookmark-folder-zone-meteor--b" />
          <span className="bookmark-folder-zone-meteor bookmark-folder-zone-meteor--c" />
        </div>
      )}

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
        <BookmarkFolderIcon size={15} className="bookmark-folder-zone-icon" />
        <span className="bookmark-folder-zone-title-group">
          <span className="bookmark-folder-zone-title font-doc-translation-bold">
            {folderName}
          </span>
          {isDefault && (
            <BookmarkDefaultFolderIndicator
              iconSize={16}
              title={BOOKMARK_PINNED_FOLDER_LABEL}
            />
          )}
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
