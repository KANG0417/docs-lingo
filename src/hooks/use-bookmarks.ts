"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MAX_BOOKMARK_FOLDER_COUNT } from "@/constants/bookmark";
import {
  createBookmarkFolder,
  getUserBookmarks,
  moveBookmarkToFolder,
  updateBookmarkFolders,
} from "@/services/bookmark-client-service";
import type { BookmarkFolder, BookmarkFolderDraft, BookmarkListItem } from "@/types/bookmark";

interface UseBookmarksReturn {
  folders: BookmarkFolder[];
  items: BookmarkListItem[];
  isLoading: boolean;
  movingDocumentId: string | null;
  isCreatingFolder: boolean;
  isUpdatingFolders: boolean;
  errorMessage: string | null;
  canAddFolder: boolean;
  folderCountLabel: string;
  defaultFolderId: string | null;
  refreshBookmarks: () => Promise<void>;
  createFolder: (name: string) => Promise<BookmarkFolder | null>;
  moveBookmark: (
    documentId: string,
    folderId: string | null,
  ) => Promise<boolean>;
  saveFolderEdits: (
    drafts: BookmarkFolderDraft[],
    deletedFolderIds?: string[],
  ) => Promise<boolean>;
}

export const useBookmarks = (): UseBookmarksReturn => {
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [items, setItems] = useState<BookmarkListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [movingDocumentId, setMovingDocumentId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [isUpdatingFolders, setIsUpdatingFolders] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const customFolderCount = useMemo(
    () => folders.filter((folder) => !folder.isDefault).length,
    [folders],
  );
  const canAddFolder = customFolderCount < MAX_BOOKMARK_FOLDER_COUNT;
  const folderCountLabel = `${customFolderCount}/${MAX_BOOKMARK_FOLDER_COUNT}`;
  const defaultFolderId =
    folders.find((folder) => folder.isDefault)?.id ?? null;

  const refreshBookmarks = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getUserBookmarks();
      setFolders(response.folders);
      setItems(response.items);
    } catch (error) {
      setFolders([]);
      setItems([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "북마크 목록을 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBookmarks();
  }, [refreshBookmarks]);

  const createFolder = useCallback(
    async (name: string): Promise<BookmarkFolder | null> => {
      if (!canAddFolder) {
        setErrorMessage(
          `폴더는 최대 ${MAX_BOOKMARK_FOLDER_COUNT}개까지 만들 수 있습니다.`,
        );
        return null;
      }

      setIsCreatingFolder(true);
      setErrorMessage(null);

      try {
        const folder = await createBookmarkFolder(name);
        setFolders((previous) => [...previous, folder]);
        return folder;
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "폴더를 만들지 못했습니다.",
        );
        return null;
      } finally {
        setIsCreatingFolder(false);
      }
    },
    [canAddFolder],
  );

  const saveFolderEdits = useCallback(
    async (
      drafts: BookmarkFolderDraft[],
      deletedFolderIds: string[] = [],
    ): Promise<boolean> => {
      setIsUpdatingFolders(true);
      setErrorMessage(null);

      try {
        const nextFolders = await updateBookmarkFolders(
          drafts,
          deletedFolderIds,
        );
        setFolders(nextFolders);
        await refreshBookmarks();
        return true;
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "폴더를 수정하지 못했습니다.",
        );
        return false;
      } finally {
        setIsUpdatingFolders(false);
      }
    },
    [refreshBookmarks],
  );

  const moveBookmark = useCallback(
    async (
      documentId: string,
      folderId: string | null,
    ): Promise<boolean> => {
      const targetItem = items.find((item) => item.documentId === documentId);
      const resolvedFolderId = folderId ?? defaultFolderId;

      if (!targetItem || targetItem.folderId === resolvedFolderId) {
        return true;
      }

      setMovingDocumentId(documentId);
      setErrorMessage(null);

      setItems((previous) =>
        previous.map((item) =>
          item.documentId === documentId
            ? { ...item, folderId: resolvedFolderId }
            : item,
        ),
      );

      try {
        await moveBookmarkToFolder(documentId, folderId);
        return true;
      } catch (error) {
        setItems((previous) =>
          previous.map((item) =>
            item.documentId === documentId
              ? { ...item, folderId: targetItem.folderId }
              : item,
          ),
        );
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "북마크를 이동하지 못했습니다.",
        );
        return false;
      } finally {
        setMovingDocumentId(null);
      }
    },
    [defaultFolderId, items],
  );

  return {
    folders,
    items,
    isLoading,
    movingDocumentId,
    isCreatingFolder,
    isUpdatingFolders,
    errorMessage,
    canAddFolder,
    folderCountLabel,
    defaultFolderId,
    refreshBookmarks,
    createFolder,
    moveBookmark,
    saveFolderEdits,
  };
};
