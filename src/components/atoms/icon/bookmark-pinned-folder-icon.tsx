import type { ReactElement } from "react";

interface BookmarkPinnedFolderIconProps {
  size?: number;
  className?: string;
}

export const BookmarkPinnedFolderIcon = ({
  size = 16,
  className,
}: BookmarkPinnedFolderIconProps): ReactElement => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 17v5" />
      <path d="M9 4h6l1 7H8L9 4Z" />
      <path d="M9 11v3a3 3 0 0 0 6 0v-3" />
    </svg>
  );
};
