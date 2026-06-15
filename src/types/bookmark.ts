import type { DocumentTranslationResult } from "@/types/translation";

export interface DocumentBookmarkStatus {
  isBookmarked: boolean;
  bookmarkId: string | null;
}

export interface ToggleDocumentBookmarkPayload {
  documentId: string;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
}

export interface BookmarkListItem {
  bookmarkId: string;
  documentId: string;
  folderId: string | null;
  title: string;
  url: string | null;
  historySummary: string;
  bookmarkedAt: string;
  translation: DocumentTranslationResult | null;
}

export interface BookmarksResponse {
  folders: BookmarkFolder[];
  items: BookmarkListItem[];
}

export interface CreateBookmarkFolderPayload {
  name: string;
}

export interface BookmarkFolderDraft {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface UpdateBookmarkFoldersPayload {
  folders: BookmarkFolderDraft[];
  deletedFolderIds?: string[];
}

export interface MoveBookmarkPayload {
  documentId: string;
  folderId: string | null;
}
