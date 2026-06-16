"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { BookmarkFolderDeleteConfirmModal } from "@/components/molecules/bookmark/bookmark-folder-delete-confirm-modal";
import { BookmarkFolderEditActions } from "@/components/molecules/bookmark/bookmark-folder-edit-actions";
import { BookmarkFolderEditRow } from "@/components/molecules/bookmark/bookmark-folder-edit-row";
import { BookmarkPinnedFolderIcon } from "@/components/atoms/icon/bookmark-pinned-folder-icon";
import { BOOKMARK_PINNED_FOLDER_LABEL } from "@/constants/bookmark";
import type { BookmarkFolderDraft } from "@/types/bookmark";
import { sortPinnedFolderFirst } from "@/utils/bookmark-folder-order";
import { validateFolderName } from "@/lib/bookmark/validate-folder-name";

interface BookmarkFolderEditListProps {
  folders: BookmarkFolderDraft[];
  itemCountByFolderId: Map<string, number>;
  isSaving: boolean;
  onSave: (folders: BookmarkFolderDraft[]) => void;
  onCancel: () => void;
  onChange: (folders: BookmarkFolderDraft[]) => void;
  onDeleteFolder?: (folderId: string) => void;
}

interface PendingDeleteFolder {
  id: string;
  name: string;
  itemCount: number;
}

const reorderFolders = (
  folders: BookmarkFolderDraft[],
  dragFolderId: string,
  targetFolderId: string,
): BookmarkFolderDraft[] => {
  if (dragFolderId === targetFolderId) {
    return folders;
  }

  const fromIndex = folders.findIndex((folder) => folder.id === dragFolderId);
  const toIndex = folders.findIndex((folder) => folder.id === targetFolderId);

  if (fromIndex === -1 || toIndex === -1) {
    return folders;
  }

  const nextFolders = [...folders];
  const [movedFolder] = nextFolders.splice(fromIndex, 1);
  nextFolders.splice(toIndex, 0, movedFolder);

  return nextFolders;
};

export const BookmarkFolderEditList = ({
  folders,
  itemCountByFolderId,
  isSaving,
  onSave,
  onCancel,
  onChange,
  onDeleteFolder,
}: BookmarkFolderEditListProps): ReactElement => {
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [pendingDeleteFolder, setPendingDeleteFolder] =
    useState<PendingDeleteFolder | null>(null);

  const pinnedFolder = folders.find((folder) => folder.isDefault);
  const hasInvalidFolderName = folders.some(
    (folder) => validateFolderName(folder.name) !== null,
  );

  const handleNameChange = (folderId: string, name: string): void => {
    onChange(
      folders.map((folder) =>
        folder.id === folderId ? { ...folder, name } : folder,
      ),
    );
  };

  const handleDrop = (targetFolderId: string): void => {
    if (!draggingFolderId) {
      return;
    }

    onChange(
      sortPinnedFolderFirst(
        reorderFolders(folders, draggingFolderId, targetFolderId),
      ),
    );
    setDraggingFolderId(null);
  };

  const handleDeleteRequest = (folderId: string): void => {
    const folder = folders.find((item) => item.id === folderId);

    if (!folder || folder.isDefault) {
      return;
    }

    setPendingDeleteFolder({
      id: folder.id,
      name: folder.name,
      itemCount: itemCountByFolderId.get(folder.id) ?? 0,
    });
  };

  const handleConfirmDelete = (): void => {
    if (!pendingDeleteFolder) {
      return;
    }

    onDeleteFolder?.(pendingDeleteFolder.id);
    setPendingDeleteFolder(null);
  };

  const handlePin = (folderId: string): void => {
    onChange(
      sortPinnedFolderFirst(
        folders.map((folder) => ({
          ...folder,
          isDefault: folder.id === folderId,
        })),
      ),
    );
  };

  return (
    <>
      <section aria-label="폴더 수정" className="bookmark-folder-edit-panel">
        <header className="bookmark-folder-edit-header">
          <h3 className="bookmark-folder-edit-title font-doc-title">
            폴더 수정
          </h3>
          {pinnedFolder && (
            <p className="bookmark-folder-edit-pinned-summary font-doc-aux">
              <BookmarkPinnedFolderIcon size={16} aria-hidden="true" />
              <span>
                <strong>{BOOKMARK_PINNED_FOLDER_LABEL}</strong>:{" "}
                <strong>{pinnedFolder.name}</strong>
              </span>
            </p>
          )}
        </header>

        <div className="bookmark-folder-edit-guide font-doc-aux">
          <p className="bookmark-folder-edit-guide-line">
            폴더 이름은 <strong>15자 이내</strong>로 입력해 주세요.
          </p>
          <p className="bookmark-folder-edit-guide-line">
            <span className="bookmark-folder-edit-guide-grip" aria-hidden="true">
              ⠿
            </span>{" "}
            <strong>핸들</strong>을 <strong>드래그</strong>해{" "}
            <strong>폴더 순서</strong>를 변경할 수 있습니다.
          </p>
          <p className="bookmark-folder-edit-guide-line">
            <strong>핀 아이콘</strong>을 눌러{" "}
            <strong>{BOOKMARK_PINNED_FOLDER_LABEL}</strong>를 지정할 수 있으며,{" "}
            <strong>1개</strong>만 지정되고 <strong>삭제</strong>할 수 없습니다.
          </p>
        </div>

        {folders.length === 0 ? (
          <p className="bookmark-folder-edit-empty font-doc-aux">
            수정할 폴더가 없습니다.
          </p>
        ) : (
          <ul className="bookmark-folder-edit-list">
            {folders.map((folder) => (
              <li key={folder.id}>
                <BookmarkFolderEditRow
                  folder={folder}
                  itemCount={itemCountByFolderId.get(folder.id) ?? 0}
                  isDragging={draggingFolderId === folder.id}
                  onNameChange={handleNameChange}
                  onDragStart={setDraggingFolderId}
                  onDragEnd={() => {
                    setDraggingFolderId(null);
                  }}
                  onDrop={handleDrop}
                  onDelete={handleDeleteRequest}
                  onPin={handlePin}
                />
              </li>
            ))}
          </ul>
        )}

        <BookmarkFolderEditActions
          isSaving={isSaving}
          isSaveDisabled={hasInvalidFolderName}
          onSave={() => {
            onSave(folders);
          }}
          onCancel={onCancel}
        />
      </section>

      <BookmarkFolderDeleteConfirmModal
        isOpen={pendingDeleteFolder !== null}
        folderName={pendingDeleteFolder?.name ?? ""}
        itemCount={pendingDeleteFolder?.itemCount ?? 0}
        onClose={() => {
          setPendingDeleteFolder(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};
