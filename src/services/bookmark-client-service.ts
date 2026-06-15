import type {
  BookmarkFolder,
  BookmarkFolderDraft,
  BookmarksResponse,
  DocumentBookmarkStatus,
} from "@/types/bookmark";

const readApiErrorMessage = async (
  response: Response,
  fallbackMessage: string,
): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

export const getUserBookmarks = async (): Promise<BookmarksResponse> => {
  const response = await fetch("/api/bookmarks", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "북마크 목록을 불러오지 못했습니다."),
    );
  }

  return (await response.json()) as BookmarksResponse;
};

export const createBookmarkFolder = async (
  name: string,
): Promise<BookmarkFolder> => {
  const response = await fetch("/api/bookmarks/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "폴더를 만들지 못했습니다."),
    );
  }

  return (await response.json()) as BookmarkFolder;
};

export const updateBookmarkFolders = async (
  folders: BookmarkFolderDraft[],
  deletedFolderIds: string[] = [],
): Promise<BookmarkFolder[]> => {
  const response = await fetch("/api/bookmarks/folders", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folders, deletedFolderIds }),
  });

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "폴더를 수정하지 못했습니다."),
    );
  }

  const payload = (await response.json()) as { folders: BookmarkFolder[] };
  return payload.folders;
};

export const moveBookmarkToFolder = async (
  documentId: string,
  folderId: string | null,
): Promise<void> => {
  const response = await fetch("/api/bookmarks/move", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, folderId }),
  });

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "북마크를 이동하지 못했습니다."),
    );
  }
};

export const getDocumentBookmarkStatus = async (
  documentId: string,
): Promise<DocumentBookmarkStatus> => {
  const searchParams = new URLSearchParams({ documentId });
  const response = await fetch(`/api/bookmarks?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "북마크 상태를 불러오지 못했습니다."),
    );
  }

  return (await response.json()) as DocumentBookmarkStatus;
};

export const addDocumentBookmark = async (
  documentId: string,
): Promise<DocumentBookmarkStatus> => {
  const response = await fetch("/api/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId }),
  });

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "북마크 추가에 실패했습니다."),
    );
  }

  return (await response.json()) as DocumentBookmarkStatus;
};

export const removeDocumentBookmark = async (
  documentId: string,
): Promise<DocumentBookmarkStatus> => {
  const searchParams = new URLSearchParams({ documentId });
  const response = await fetch(`/api/bookmarks?${searchParams.toString()}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "북마크 삭제에 실패했습니다."),
    );
  }

  return (await response.json()) as DocumentBookmarkStatus;
};
