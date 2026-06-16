import type { ReactElement } from "react";
import { MAX_BOOKMARK_FOLDER_NAME_LENGTH } from "@/constants/bookmark";
import { getFolderNameLength } from "@/lib/bookmark/validate-folder-name";

interface BookmarkFolderNameCounterProps {
  value: string;
  className?: string;
}

const COUNTER_DIGIT_WIDTH = String(MAX_BOOKMARK_FOLDER_NAME_LENGTH).length;

export const BookmarkFolderNameCounter = ({
  value,
  className,
}: BookmarkFolderNameCounterProps): ReactElement => {
  const currentLength = getFolderNameLength(value);
  const isAtLimit = currentLength >= MAX_BOOKMARK_FOLDER_NAME_LENGTH;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={`폴더 이름 ${currentLength}자, 최대 ${MAX_BOOKMARK_FOLDER_NAME_LENGTH}자`}
      className={className}
      data-at-limit={isAtLimit ? "true" : "false"}
    >
      <span
        className="bookmark-folder-name-counter-current"
        style={{ minWidth: `${COUNTER_DIGIT_WIDTH}ch` }}
      >
        {currentLength}
      </span>
      <span className="bookmark-folder-name-counter-separator">/</span>
      <span className="bookmark-folder-name-counter-max">
        {MAX_BOOKMARK_FOLDER_NAME_LENGTH}
      </span>
    </span>
  );
};
