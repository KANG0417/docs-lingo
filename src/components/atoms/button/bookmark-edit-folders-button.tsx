import clsx from "clsx";
import type { ReactElement } from "react";

interface BookmarkEditFoldersButtonProps {
  disabled?: boolean;
  isActive?: boolean;
  onClick: () => void;
}

export const BookmarkEditFoldersButton = ({
  disabled = false,
  isActive = false,
  onClick,
}: BookmarkEditFoldersButtonProps): ReactElement => {
  return (
    <button
      type="button"
      aria-label="폴더 수정"
      aria-pressed={isActive}
      title="폴더 수정"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "bookmark-toolbar-btn bookmark-toolbar-btn-icon-only",
        isActive && "bookmark-toolbar-btn-active",
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="bookmark-toolbar-btn-icon"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>
  );
};
