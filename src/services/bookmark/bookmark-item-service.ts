import { getSupabaseAdminClient } from "@/lib/supabase/supabase-admin";
import { getDefaultFolderId } from "@/services/bookmark/bookmark-default-folder";
import type { DocumentBookmarkStatus } from "@/types/bookmark";

interface BookmarkStatusRow {
  id: string;
}

export const moveBookmarkToFolder = async (
  userId: string,
  documentId: string,
  folderId: string | null,
): Promise<void> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const targetFolderId = folderId ?? (await getDefaultFolderId(userId));

  const { data: folder, error: folderError } = await supabase
    .from("bookmark_folders")
    .select("id")
    .eq("id", targetFolderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (folderError || !folder) {
    throw new Error("폴더를 찾을 수 없습니다.");
  }

  const { error } = await supabase
    .from("bookmarks")
    .update({ folder_id: targetFolderId })
    .eq("user_id", userId)
    .eq("document_id", documentId);

  if (error) {
    console.error("[moveBookmarkToFolder]", error.message);
    throw new Error("북마크를 이동하지 못했습니다.");
  }
};

export const getDocumentBookmarkStatus = async (
  userId: string,
  documentId: string,
): Promise<DocumentBookmarkStatus> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("document_id", documentId)
    .maybeSingle();

  if (error) {
    console.error("[getDocumentBookmarkStatus]", error.message);
    throw new Error("북마크 상태를 확인하지 못했습니다.");
  }

  const bookmark = data as BookmarkStatusRow | null;

  return {
    isBookmarked: Boolean(bookmark),
    bookmarkId: bookmark?.id ?? null,
  };
};

export const addDocumentBookmark = async (
  userId: string,
  documentId: string,
): Promise<DocumentBookmarkStatus> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError || !document) {
    throw new Error("문서를 찾을 수 없습니다.");
  }

  const existing = await getDocumentBookmarkStatus(userId, documentId);
  if (existing.isBookmarked) {
    return existing;
  }

  const defaultFolderId = await getDefaultFolderId(userId);

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: userId,
      document_id: documentId,
      folder_id: defaultFolderId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[addDocumentBookmark]", error?.message);
    throw new Error("북마크 추가에 실패했습니다.");
  }

  return {
    isBookmarked: true,
    bookmarkId: data.id,
  };
};

export const removeDocumentBookmark = async (
  userId: string,
  documentId: string,
): Promise<DocumentBookmarkStatus> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("document_id", documentId);

  if (error) {
    console.error("[removeDocumentBookmark]", error.message);
    throw new Error("북마크 삭제에 실패했습니다.");
  }

  return {
    isBookmarked: false,
    bookmarkId: null,
  };
};
