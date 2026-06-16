import type { ReactElement } from "react";
import { BookmarkPinnedFolderIcon } from "@/components/atoms/icon/bookmark-pinned-folder-icon";
import { BOOKMARK_PINNED_FOLDER_LABEL } from "@/constants/bookmark";

interface BookmarkDefaultFolderIndicatorProps {
  title?: string;
  iconSize?: number;
}

export const BookmarkDefaultFolderIndicator = ({
  title = BOOKMARK_PINNED_FOLDER_LABEL,
  iconSize = 18,
}: BookmarkDefaultFolderIndicatorProps): ReactElement => {
  return (
    <span
      className="bookmark-folder-icon-btn bookmark-folder-icon-btn--pinned"
      title={title}
      aria-label={title}
    >
      <BookmarkPinnedFolderIcon size={iconSize} />
    </span>
  );
};
