"use client";

import clsx from "clsx";
import { useState } from "react";
import type { DragEvent, ReactElement } from "react";
import { BookmarkFolderNameCounter } from "@/components/atoms/text/bookmark-folder-name-counter";
import { BookmarkPinnedFolderIcon } from "@/components/atoms/icon/bookmark-pinned-folder-icon";
import { TrashIcon } from "@/components/atoms/icon/trash-icon";
import {
  BOOKMARK_FOLDER_DRAG_ID_MIME,
  BOOKMARK_PINNED_FOLDER_LABEL,
} from "@/constants/bookmark";
import { enforceFolderNameMaxLength } from "@/lib/bookmark/validate-folder-name";
import type { BookmarkFolderDraft } from "@/types/bookmark";

interface BookmarkFolderEditRowProps {
  folder: BookmarkFolderDraft;
  itemCount: number;
  isDragging: boolean;
  onNameChange: (folderId: string, name: string) => void;
  onDragStart: (folderId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetFolderId: string) => void;
  onDelete?: (folderId: string) => void;
  onPin?: (folderId: string) => void;
}

export const BookmarkFolderEditRow = ({
  folder,
  itemCount,
  isDragging,
  onNameChange,
  onDragStart,
  onDragEnd,
  onDrop,
  onDelete,
  onPin,
}: BookmarkFolderEditRowProps): ReactElement => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const handleDragStart = (event: DragEvent<HTMLElement>): void => {
    event.dataTransfer.setData(BOOKMARK_FOLDER_DRAG_ID_MIME, folder.id);
    event.dataTransfer.effectAllowed = "move";
    onDragStart(folder.id);
  };

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
    onDrop(folder.id);
  };

  return (
    <article
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        "bookmark-folder-edit-row",
        folder.isDefault && "bookmark-folder-edit-row-pinned",
        isDragging && "bookmark-folder-edit-row-dragging",
        isDragOver && "bookmark-folder-edit-row-over",
      )}
    >
      <span
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        aria-hidden="true"
        className="bookmark-folder-edit-grip font-doc-aux"
        title="드래그해서 순서 변경"
      >
        ⠿
      </span>

      <button
        type="button"
        aria-label={
          folder.isDefault
            ? `${BOOKMARK_PINNED_FOLDER_LABEL}: ${folder.name}`
            : `"${folder.name}"을(를) ${BOOKMARK_PINNED_FOLDER_LABEL}로 지정`
        }
        aria-pressed={folder.isDefault}
        title={
          folder.isDefault
            ? BOOKMARK_PINNED_FOLDER_LABEL
            : `${BOOKMARK_PINNED_FOLDER_LABEL}로 지정`
        }
        disabled={folder.isDefault}
        onClick={() => {
          onPin?.(folder.id);
        }}
        className={clsx(
          "bookmark-folder-icon-btn",
          folder.isDefault
            ? "bookmark-folder-icon-btn--pin-active"
            : "bookmark-folder-icon-btn--pin",
        )}
      >
        <BookmarkPinnedFolderIcon size={18} />
      </button>

      <div className="bookmark-folder-edit-row-main">
        <div className="bookmark-folder-edit-input-wrap">
          <label
            className="sr-only"
            htmlFor={`bookmark-folder-edit-${folder.id}`}
          >
            {folder.name} 폴더 이름
          </label>
          <input
            id={`bookmark-folder-edit-${folder.id}`}
            type="text"
            value={folder.name}
            onChange={(event) => {
              onNameChange(
                folder.id,
                enforceFolderNameMaxLength(event.target.value),
              );
            }}
            className="bookmark-folder-edit-input font-doc-translation-bold"
          />
          <BookmarkFolderNameCounter
            value={folder.name}
            className="bookmark-folder-name-counter bookmark-folder-name-counter--edit font-doc-aux"
          />
        </div>
      </div>

      <span className="bookmark-folder-edit-count font-doc-aux">{itemCount}</span>

      {!folder.isDefault && (
        <button
          type="button"
          aria-label={`"${folder.name}" 폴더 삭제`}
          title="폴더 삭제"
          onClick={() => {
            onDelete?.(folder.id);
          }}
          className="bookmark-folder-icon-btn bookmark-folder-icon-btn--delete"
        >
          <TrashIcon size={18} />
        </button>
      )}
    </article>
  );
};
