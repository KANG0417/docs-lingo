import type { ReactElement } from "react";

interface BookmarkAddFolderButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

export const BookmarkAddFolderButton = ({
  disabled = false,
  onClick,
}: BookmarkAddFolderButtonProps): ReactElement => {
  return (
    <button
      type="button"
      aria-label="폴더 추가"
      title="폴더 추가"
      disabled={disabled}
      onClick={onClick}
      className="bookmark-toolbar-btn bookmark-toolbar-btn-icon-only"
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
        <path d="M12 10v6" />
        <path d="M9 13h6" />
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      </svg>
    </button>
  );
};
