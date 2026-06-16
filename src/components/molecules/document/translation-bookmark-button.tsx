"use client";

import clsx from "clsx";
import type { ReactElement } from "react";
import { useDocumentBookmark } from "@/hooks/use-document-bookmark";

interface TranslationBookmarkButtonProps {
  documentId: string;
  documentTitle: string;
  isBookmarkable: boolean;
}

export const TranslationBookmarkButton = ({
  documentId,
  documentTitle,
  isBookmarkable,
}: TranslationBookmarkButtonProps): ReactElement | null => {
  const {
    isBookmarked,
    isLoading,
    isToggling,
    errorMessage,
    toggleBookmark,
  } = useDocumentBookmark({
    documentId,
    enabled: isBookmarkable,
  });

  if (!isBookmarkable) {
    return null;
  }

  const label = isBookmarked
    ? `${documentTitle} 북마크 해제`
    : `${documentTitle} 북마크에 추가`;

  const handleClick = (): void => {
    void toggleBookmark();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading || isToggling}
        aria-pressed={isBookmarked}
        aria-label={label}
        title={isBookmarked ? "북마크 해제" : "북마크에 추가"}
        className={clsx(
          "translation-bookmark-btn inline-flex shrink-0 items-center justify-center p-1",
          "disabled:cursor-default disabled:opacity-60",
          isBookmarked && "is-bookmarked",
        )}
      >
        <span className="translation-bookmark-icon-wrap relative inline-flex items-center justify-center">
          <span aria-hidden="true" className="bookmark-spark bookmark-spark--1">
            ✦
          </span>
          <span aria-hidden="true" className="bookmark-spark bookmark-spark--2">
            ✦
          </span>
          <span aria-hidden="true" className="bookmark-spark bookmark-spark--3">
            ✦
          </span>
          <svg
            className="translation-bookmark-icon"
            width={28}
            height={28}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {errorMessage ? (
        <p
          role="alert"
          className="font-doc-aux max-w-28 text-right text-xs font-semibold text-red-600"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};
