import type { ReactElement } from "react";
import { BookmarkPinnedFolderIcon } from "@/components/atoms/icon/bookmark-pinned-folder-icon";

interface BookmarkDefaultFolderIndicatorProps {
  className?: string;
}

export const BookmarkDefaultFolderIndicator = ({
  className,
}: BookmarkDefaultFolderIndicatorProps): ReactElement => {
  return (
    <span
      className={className}
      title="기본 폴더"
      aria-label="기본 폴더"
    >
      <BookmarkPinnedFolderIcon size={14} />
    </span>
  );
};
