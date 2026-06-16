"use client";

import { BOOKMARK_PINNED_FOLDER_LABEL } from "@/constants/bookmark";
import { useEffect } from "react";
import type { MouseEvent, ReactElement } from "react";

interface BookmarkFolderDeleteConfirmModalProps {
  isOpen: boolean;
  folderName: string;
  itemCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export const BookmarkFolderDeleteConfirmModal = ({
  isOpen,
  folderName,
  itemCount,
  onClose,
  onConfirm,
}: BookmarkFolderDeleteConfirmModalProps): ReactElement | null => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (): void => {
    onClose();
  };

  const handleDialogClick = (event: MouseEvent<HTMLDivElement>): void => {
    event.stopPropagation();
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md -rotate-[0.5deg]">
        <span
          aria-hidden="true"
          className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rotate-1 rounded-[2px] bg-red-200/50 shadow-sm backdrop-blur-sm"
        />

        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="bookmark-folder-delete-title"
          aria-describedby="bookmark-folder-delete-description"
          className="memo-lines rounded-sm border border-amber-200 bg-amber-50 p-6 shadow-[4px_8px_24px_rgba(0,0,0,0.4)]"
          onClick={handleDialogClick}
        >
          <h2
            id="bookmark-folder-delete-title"
            className="font-doc-title text-center text-base font-extrabold text-red-700"
          >
            폴더를 삭제할까요?
          </h2>

          <p
            id="bookmark-folder-delete-description"
            className="font-doc-aux mt-4 text-center text-sm leading-relaxed text-amber-900/90"
          >
            <span className="font-bold text-amber-950">&quot;{folderName}&quot;</span>
            {" "}폴더를 <strong>삭제</strong>합니다.
            {itemCount > 0 && (
              <>
                <br />
                안의 메모 <strong>{itemCount}개</strong>는{" "}
                <strong>{BOOKMARK_PINNED_FOLDER_LABEL}</strong>로 옮겨집니다.
              </>
            )}
            <br />
            <strong>저장</strong>하기 전까지는 되돌릴 수 있습니다.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bookmark-folder-delete-cancel font-doc-aux"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="bookmark-folder-delete-confirm font-doc-aux"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
