"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { BookmarkFolderDeleteConfirmModal } from "@/components/molecules/bookmark/bookmark-folder-delete-confirm-modal";
import { BookmarkFolderEditActions } from "@/components/molecules/bookmark/bookmark-folder-edit-actions";
import { BookmarkFolderEditRow } from "@/components/molecules/bookmark/bookmark-folder-edit-row";
import type { BookmarkFolderDraft } from "@/types/bookmark";

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

    onChange(reorderFolders(folders, draggingFolderId, targetFolderId));
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

  return (
    <>
      <section aria-label="폴더 수정" className="bookmark-folder-edit-panel">
        <p className="bookmark-folder-edit-guide font-doc-aux">
          폴더 이름을 바꾸거나 ⠿ 핸들을 드래그해 순서를 변경할 수 있습니다. 기본
          폴더는 삭제할 수 없습니다.
        </p>

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
                />
              </li>
            ))}
          </ul>
        )}

        <BookmarkFolderEditActions
          isSaving={isSaving}
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
