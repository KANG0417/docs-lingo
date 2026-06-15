"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { BookmarkAddFolderButton } from "@/components/atoms/button/bookmark-add-folder-button";
import { BookmarkEditFoldersButton } from "@/components/atoms/button/bookmark-edit-folders-button";
import { BookmarkCreateFolderForm } from "@/components/molecules/bookmark/bookmark-create-folder-form";
import { BookmarkFolderDropZone } from "@/components/molecules/bookmark/bookmark-folder-drop-zone";
import { BookmarkFolderEditList } from "@/components/molecules/bookmark/bookmark-folder-edit-list";
import { TranslationResultSection } from "@/components/organisms/document/translation-result-section";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { getTranslationHistoryItem } from "@/services/translation-client-service";
import type { BookmarkFolder, BookmarkFolderDraft, BookmarkListItem } from "@/types/bookmark";
import type {
  DocumentTranslationResult,
  TranslationHistoryItem,
} from "@/types/translation";

const toTranslationResult = (
  item: TranslationHistoryItem,
): DocumentTranslationResult => {
  return {
    id: item.id,
    documentId: item.documentId,
    title: item.title,
    url: item.url,
    originalContent: item.originalContent ?? "",
    translatedContent: item.translatedContent,
    summaryTerms: item.summaryTerms,
    documentImages: item.documentImages,
    documentCodeBlocks: item.documentCodeBlocks,
    createdAt: item.createdAt,
  };
};

const toFolderDrafts = (folderList: BookmarkFolder[]): BookmarkFolderDraft[] => {
  return folderList.map((folder) => ({
    id: folder.id,
    name: folder.name,
    isDefault: folder.isDefault,
  }));
};

export const BookmarksSection = (): ReactElement => {
  const {
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
    createFolder,
    moveBookmark,
    saveFolderEdits,
  } = useBookmarks();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [selectedTranslation, setSelectedTranslation] =
    useState<DocumentTranslationResult | null>(null);
  const [loadingDocumentId, setLoadingDocumentId] = useState<string | null>(
    null,
  );
  const [draggingDocumentId, setDraggingDocumentId] = useState<string | null>(
    null,
  );
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState<boolean>(false);
  const [isFolderEditMode, setIsFolderEditMode] = useState<boolean>(false);
  const [folderDrafts, setFolderDrafts] = useState<BookmarkFolderDraft[]>([]);
  const [deletedFolderIds, setDeletedFolderIds] = useState<string[]>([]);
  const [expandedFolderKeys, setExpandedFolderKeys] = useState<Set<string>>(
    new Set(),
  );

  const sortedFolders = useMemo(() => {
    return [...folders].sort((left, right) => left.sortOrder - right.sortOrder);
  }, [folders]);

  const selectedItem =
    items.find((item) => item.documentId === selectedDocumentId) ?? null;

  const itemsByFolderId = useMemo(() => {
    const grouped = new Map<string, BookmarkListItem[]>();

    sortedFolders.forEach((folder) => {
      grouped.set(folder.id, []);
    });

    items.forEach((item) => {
      const folderKey = item.folderId ?? defaultFolderId;

      if (!folderKey) {
        return;
      }

      const folderItems = grouped.get(folderKey);

      if (folderItems) {
        folderItems.push(item);
      }
    });

    return grouped;
  }, [defaultFolderId, items, sortedFolders]);

  const activeFolderKey = useMemo((): string | null => {
    if (!selectedDocumentId) {
      return defaultFolderId;
    }

    const item = items.find(
      (bookmark) => bookmark.documentId === selectedDocumentId,
    );

    return item?.folderId ?? defaultFolderId;
  }, [defaultFolderId, items, selectedDocumentId]);

  useEffect(() => {
    if (defaultFolderId && expandedFolderKeys.size === 0) {
      setExpandedFolderKeys(new Set([defaultFolderId]));
    }
  }, [defaultFolderId, expandedFolderKeys.size]);

  useEffect(() => {
    if (!isFolderEditMode && activeFolderKey) {
      setExpandedFolderKeys(new Set([activeFolderKey]));
    }
  }, [activeFolderKey, isFolderEditMode]);

  const handleSelect = (item: BookmarkListItem): void => {
    if (isFolderEditMode) {
      return;
    }

    setSelectedDocumentId(item.documentId);

    if (!item.translation) {
      setSelectedTranslation(null);
      return;
    }

    setLoadingDocumentId(item.documentId);
    setSelectedTranslation({ ...item.translation });

    void (async (): Promise<void> => {
      try {
        const fullItem = await getTranslationHistoryItem(item.translation!.id);
        setSelectedTranslation(toTranslationResult(fullItem));
      } catch (error) {
        console.error("[BookmarksSection] select", error);
      } finally {
        setLoadingDocumentId(null);
      }
    })();
  };

  const handleMove = (documentId: string, folderId: string): void => {
    if (isFolderEditMode) {
      return;
    }

    void moveBookmark(documentId, folderId);
  };

  const handleCreateFolder = async (name: string): Promise<void> => {
    const folder = await createFolder(name);

    if (folder) {
      setIsCreateFolderOpen(false);
    }
  };

  const enterFolderEditMode = (): void => {
    setIsCreateFolderOpen(false);
    setFolderDrafts(toFolderDrafts(sortedFolders));
    setDeletedFolderIds([]);
    setIsFolderEditMode(true);
  };

  const exitFolderEditMode = (): void => {
    setIsFolderEditMode(false);
    setFolderDrafts([]);
    setDeletedFolderIds([]);
  };

  const handleSaveFolderEdits = (drafts: BookmarkFolderDraft[]): void => {
    void (async (): Promise<void> => {
      const isSaved = await saveFolderEdits(drafts, deletedFolderIds);

      if (isSaved) {
        exitFolderEditMode();
      }
    })();
  };

  const handleDeleteFolder = (folderId: string): void => {
    const targetFolder = folderDrafts.find((folder) => folder.id === folderId);

    if (!targetFolder || targetFolder.isDefault) {
      return;
    }

    setFolderDrafts((previous) =>
      previous.filter((folder) => folder.id !== folderId),
    );
    setDeletedFolderIds((previous) =>
      previous.includes(folderId) ? previous : [...previous, folderId],
    );
  };

  const toggleFolder = (folderKey: string): void => {
    setExpandedFolderKeys((previous) => {
      const next = new Set(previous);

      if (next.has(folderKey)) {
        next.delete(folderKey);
      } else {
        next.add(folderKey);
      }

      return next;
    });
  };

  const totalCount = items.length;
  const hasFolders = sortedFolders.length > 0;
  const isEmpty = !isLoading && totalCount === 0 && !hasFolders;
  const showFolderList = !isLoading && hasFolders;

  const itemCountByFolderId = useMemo(() => {
    return new Map(
      sortedFolders.map((folder) => [
        folder.id,
        itemsByFolderId.get(folder.id)?.length ?? 0,
      ]),
    );
  }, [itemsByFolderId, sortedFolders]);

  return (
    <section
      aria-label="북마크 목록"
      className="bookmarks-workspace flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-center"
    >
      <aside
        aria-label="저장한 문서"
        className="relative w-full shrink-0 lg:w-96 xl:w-[28rem]"
      >
        <span
          aria-hidden="true"
          className="bookmark-memo-tape absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rotate-2 rounded-[2px] bg-indigo-200/50 shadow-sm backdrop-blur-sm"
        />

        <div className="history-memo-panel memo-lines flex min-h-[24rem] flex-col overflow-hidden rounded-sm border border-amber-200 shadow-[4px_8px_24px_rgba(0,0,0,0.45)]">
          <header className="history-memo-header border-b border-dashed border-amber-300 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-doc-title text-base font-bold text-amber-950">
                  저장한 문서
                </h2>
                <p className="font-doc-aux mt-1 text-sm text-amber-900/75">
                  {isLoading
                    ? "불러오는 중..."
                    : `총 ${totalCount}개 · 사용자 폴더 ${folderCountLabel}`}
                </p>
              </div>
              <div className="bookmark-folder-toolbar">
                <BookmarkAddFolderButton
                  disabled={
                    isLoading || isCreatingFolder || !canAddFolder || isFolderEditMode
                  }
                  onClick={() => {
                    setIsCreateFolderOpen((previous) => !previous);
                  }}
                />
                <BookmarkEditFoldersButton
                  disabled={isLoading || isUpdatingFolders || !hasFolders}
                  isActive={isFolderEditMode}
                  onClick={() => {
                    if (isFolderEditMode) {
                      exitFolderEditMode();
                      return;
                    }

                    enterFolderEditMode();
                  }}
                />
              </div>
            </div>

            {isCreateFolderOpen && !isFolderEditMode && (
              <div className="mt-3">
                {!canAddFolder && (
                  <p className="font-doc-aux mb-2 text-sm text-amber-900/80">
                    사용자 폴더는 최대 {folderCountLabel}개까지 만들 수 있습니다.
                  </p>
                )}
                <BookmarkCreateFolderForm
                  isSubmitting={isCreatingFolder}
                  onSubmit={handleCreateFolder}
                  onCancel={() => {
                    setIsCreateFolderOpen(false);
                  }}
                />
              </div>
            )}
          </header>

          <div className="history-memo-list history-memo-margin flex min-h-0 flex-1 flex-col overflow-y-auto">
            {errorMessage && (
              <p
                role="alert"
                className="font-doc-aux mx-3 mt-3 rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {errorMessage}
              </p>
            )}

            {isEmpty && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <p className="font-doc-translation-bold text-sm font-bold text-amber-950">
                  아직 저장한 북마크가 없습니다.
                </p>
                <p className="font-doc-aux text-sm leading-relaxed text-amber-900/70">
                  문서를 읽고 북마크에 추가하면 기본 저장소에 기록됩니다.
                </p>
              </div>
            )}

            {showFolderList && !isFolderEditMode && (
              <div className="bookmark-folder-stack flex flex-col gap-3 px-2 py-3">
                {sortedFolders.map((folder) => (
                  <BookmarkFolderDropZone
                    key={folder.id}
                    folderId={folder.id}
                    folderName={folder.name}
                    isDefault={folder.isDefault}
                    items={itemsByFolderId.get(folder.id) ?? []}
                    isExpanded={expandedFolderKeys.has(folder.id)}
                    selectedDocumentId={selectedDocumentId}
                    loadingDocumentId={loadingDocumentId}
                    movingDocumentId={movingDocumentId}
                    draggingDocumentId={draggingDocumentId}
                    onToggle={() => {
                      toggleFolder(folder.id);
                    }}
                    onSelect={handleSelect}
                    onMove={handleMove}
                    onDragStart={setDraggingDocumentId}
                    onDragEnd={() => {
                      setDraggingDocumentId(null);
                    }}
                  />
                ))}
              </div>
            )}

            {showFolderList && isFolderEditMode && (
              <div className="bookmark-folder-stack flex flex-col gap-3 px-2 py-3">
                <BookmarkFolderEditList
                  folders={folderDrafts}
                  itemCountByFolderId={itemCountByFolderId}
                  isSaving={isUpdatingFolders}
                  onSave={handleSaveFolderEdits}
                  onCancel={exitFolderEditMode}
                  onChange={setFolderDrafts}
                  onDeleteFolder={handleDeleteFolder}
                />
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="bookmarks-main min-w-0 flex-1">
        {!selectedItem && !isLoading && totalCount > 0 && !isFolderEditMode && (
          <p className="bookmarks-placeholder font-doc-aux">
            왼쪽 메모에서 문서를 선택하면 번역 내용을 볼 수 있습니다.
            <br />
            메모를 드래그해서 다른 폴더로 이동할 수 있습니다.
          </p>
        )}

        {isFolderEditMode && (
          <p className="bookmarks-placeholder bookmarks-placeholder-edit font-doc-aux">
            폴더 수정 중입니다. 이름과 순서를 변경한 뒤 저장해 주세요. 기본 폴더는
            삭제할 수 없습니다.
          </p>
        )}

        {selectedItem && !selectedTranslation && !isFolderEditMode && (
          <p className="bookmarks-placeholder bookmarks-placeholder-warn font-doc-aux">
            이 문서의 번역 기록이 없습니다. 메인 페이지에서 다시 번역해 주세요.
          </p>
        )}

        {selectedTranslation && !isFolderEditMode && (
          <div className="bookmarks-reader-panel">
            <TranslationResultSection
              result={selectedTranslation}
              showTranslationResultLabel={false}
            />
          </div>
        )}
      </div>
    </section>
  );
};
