import type { ReactElement } from "react";

interface BookmarkFolderEditActionsProps {
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const BookmarkFolderEditActions = ({
  isSaving,
  onSave,
  onCancel,
}: BookmarkFolderEditActionsProps): ReactElement => {
  return (
    <div className="bookmark-folder-edit-actions">
      <button
        type="button"
        disabled={isSaving}
        onClick={onSave}
        className="bookmark-folder-edit-save font-doc-aux"
      >
        {isSaving ? "저장 중..." : "저장"}
      </button>
      <button
        type="button"
        disabled={isSaving}
        onClick={onCancel}
        className="bookmark-folder-edit-cancel font-doc-aux"
      >
        취소
      </button>
    </div>
  );
};
