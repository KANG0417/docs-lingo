"use client";

import clsx from "clsx";
import { useState } from "react";
import type { DragEvent, ReactElement } from "react";
import { BookmarkDefaultFolderIndicator } from "@/components/atoms/icon/bookmark-default-folder-indicator";
import { BookmarkFolderIcon } from "@/components/atoms/icon/bookmark-folder-icon";
import { BookmarkPinnedFolderIcon } from "@/components/atoms/icon/bookmark-pinned-folder-icon";
import { TrashIcon } from "@/components/atoms/icon/trash-icon";
import {
  BOOKMARK_FOLDER_DRAG_ID_MIME,
  MAX_BOOKMARK_FOLDER_NAME_LENGTH,
} from "@/constants/bookmark";
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
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        "bookmark-folder-edit-row",
        isDragging && "bookmark-folder-edit-row-dragging",
        isDragOver && "bookmark-folder-edit-row-over",
      )}
    >
      <span
        aria-hidden="true"
        className="bookmark-folder-edit-grip font-doc-aux"
        title="드래그해서 순서 변경"
      >
        ⠿
      </span>
      {folder.isDefault ? (
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
      <label className="sr-only" htmlFor={`bookmark-folder-edit-${folder.id}`}>
        {folder.name} 폴더 이름
      </label>
      <input
        id={`bookmark-folder-edit-${folder.id}`}
        type="text"
        value={folder.name}
        maxLength={MAX_BOOKMARK_FOLDER_NAME_LENGTH}
        onChange={(event) => {
          onNameChange(folder.id, event.target.value);
        }}
        className="bookmark-folder-edit-input font-doc-aux"
      />
      <span className="bookmark-folder-zone-count font-doc-aux">{itemCount}</span>
      {folder.isDefault ? (
        <BookmarkDefaultFolderIndicator className="bookmark-folder-default-badge" />
      ) : (
        <button
          type="button"
          aria-label={`"${folder.name}" 폴더 삭제`}
          title="폴더 삭제"
          onClick={() => {
            onDelete?.(folder.id);
          }}
          className="bookmark-folder-edit-delete-btn"
        >
          <TrashIcon size={15} className="bookmark-folder-edit-delete-icon" />
        </button>
      )}
    </article>
  );
};
