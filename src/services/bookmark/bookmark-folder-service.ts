import { getSupabaseAdminClient } from "@/lib/supabase/supabase-admin";
import {
  MAX_BOOKMARK_FOLDER_COUNT,
  BOOKMARK_PINNED_FOLDER_LABEL,
  MAX_BOOKMARK_FOLDER_NAME_LENGTH,
} from "@/constants/bookmark";
import {
  resolveUniqueFolderName,
  resolveUniqueFolderNames,
} from "@/lib/bookmark/resolve-unique-folder-name";
import { getFolderNameLength } from "@/lib/bookmark/validate-folder-name";
import {
  FOLDER_SELECT_FULL,
  countCustomUserFolders,
  fetchUserFolders,
  isMissingFolderIsDefaultError,
  isMissingFolderSortOrderError,
  isUniqueViolationError,
  mapFolderRow,
  type BookmarkFolderRow,
} from "@/services/bookmark/bookmark-default-folder";
import type { BookmarkFolder, BookmarkFolderDraft } from "@/types/bookmark";

export const createBookmarkFolder = async (
  userId: string,
  name: string,
): Promise<BookmarkFolder> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("폴더 이름을 입력해 주세요.");
  }

  if (getFolderNameLength(trimmedName) > MAX_BOOKMARK_FOLDER_NAME_LENGTH) {
    throw new Error(
      `폴더 이름은 ${MAX_BOOKMARK_FOLDER_NAME_LENGTH}자 이하로 입력해 주세요.`,
    );
  }

  const folderCount = await countCustomUserFolders(userId);

  if (folderCount >= MAX_BOOKMARK_FOLDER_COUNT) {
    throw new Error(
      `폴더는 최대 ${MAX_BOOKMARK_FOLDER_COUNT}개까지 만들 수 있습니다.`,
    );
  }

  const existingFolders = await fetchUserFolders(userId);
  const existingNames = existingFolders.map((folder) => folder.name);
  const uniqueName = resolveUniqueFolderName(trimmedName, existingNames);
  const nextSortOrder =
    existingFolders.reduce(
      (maxOrder, folder) => Math.max(maxOrder, folder.sortOrder),
      -1,
    ) + 1;

  const insertPayload: {
    user_id: string;
    name: string;
    sort_order?: number;
    is_default?: boolean;
  } = {
    user_id: userId,
    name: uniqueName,
    sort_order: nextSortOrder,
    is_default: false,
  };

  const { data, error } = await supabase
    .from("bookmark_folders")
    .insert(insertPayload)
    .select(FOLDER_SELECT_FULL)
    .single();

  if (error || !data) {
    if (isMissingFolderSortOrderError(error?.message ?? "")) {
      const legacyInsert = await supabase
        .from("bookmark_folders")
        .insert({
          user_id: userId,
          name: uniqueName,
        })
        .select("id, name, created_at")
        .single();

      if (legacyInsert.error || !legacyInsert.data) {
        console.error("[createBookmarkFolder]", legacyInsert.error?.message);
        throw new Error("폴더를 만들지 못했습니다.");
      }

      return mapFolderRow(
        legacyInsert.data as BookmarkFolderRow,
        folderCount,
        false,
      );
    }

    console.error("[createBookmarkFolder]", error?.message);
    throw new Error("폴더를 만들지 못했습니다.");
  }

  const folder = data as BookmarkFolderRow;

  return mapFolderRow(folder, folder.sort_order ?? folderCount, false);
};

const buildRenameStagingFolderName = (folderId: string): string => {
  const compactId = folderId.replace(/-/g, "").slice(0, 14);

  return `~${compactId}`;
};

const clearUserFolderDefaultFlags = async (userId: string): Promise<void> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { error } = await supabase
    .from("bookmark_folders")
    .update({ is_default: false })
    .eq("user_id", userId);

  if (error && !isMissingFolderIsDefaultError(error.message)) {
    console.error("[updateBookmarkFolders] clear defaults", error.message);
    throw new Error("폴더를 수정하지 못했습니다.");
  }
};

const stageFolderNamesForRename = async (
  userId: string,
  folderIds: string[],
): Promise<void> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  for (const folderId of folderIds) {
    const { error } = await supabase
      .from("bookmark_folders")
      .update({ name: buildRenameStagingFolderName(folderId) })
      .eq("id", folderId)
      .eq("user_id", userId);

    if (error) {
      console.error("[updateBookmarkFolders] stage rename", error.message);

      if (isUniqueViolationError(error.message)) {
        throw new Error("이미 사용 중인 폴더 이름입니다.");
      }

      throw new Error("폴더를 수정하지 못했습니다.");
    }
  }
};

const throwFolderUpdateError = (errorMessage: string): never => {
  if (isUniqueViolationError(errorMessage)) {
    throw new Error("이미 사용 중인 폴더 이름입니다.");
  }

  throw new Error("폴더를 수정하지 못했습니다.");
};

const applyFolderNameAndSortOrder = async (
  userId: string,
  update: {
    id: string;
    name: string;
    sort_order: number;
  },
): Promise<void> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { error: fullUpdateError } = await supabase
    .from("bookmark_folders")
    .update({
      name: update.name,
      sort_order: update.sort_order,
    })
    .eq("id", update.id)
    .eq("user_id", userId);

  if (!fullUpdateError) {
    return;
  }

  if (isMissingFolderSortOrderError(fullUpdateError.message)) {
    const { error: legacyUpdateError } = await supabase
      .from("bookmark_folders")
      .update({ name: update.name })
      .eq("id", update.id)
      .eq("user_id", userId);

    if (!legacyUpdateError) {
      return;
    }

    console.error("[updateBookmarkFolders] legacy name", legacyUpdateError.message);
    throwFolderUpdateError(legacyUpdateError.message);
  }

  console.error("[updateBookmarkFolders] name sort", fullUpdateError.message);
  throwFolderUpdateError(fullUpdateError.message);
};

const assignPinnedFolderFlag = async (
  userId: string,
  pinnedFolderId: string,
): Promise<void> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { error } = await supabase
    .from("bookmark_folders")
    .update({ is_default: true })
    .eq("id", pinnedFolderId)
    .eq("user_id", userId);

  if (!error) {
    return;
  }

  if (isMissingFolderIsDefaultError(error.message)) {
    return;
  }

  console.error("[updateBookmarkFolders] pin flag", error.message);

  if (isUniqueViolationError(error.message)) {
    throw new Error(`${BOOKMARK_PINNED_FOLDER_LABEL}를 지정하지 못했습니다.`);
  }

  throw new Error("폴더를 수정하지 못했습니다.");
};

export const updateBookmarkFolders = async (
  userId: string,
  folderDrafts: BookmarkFolderDraft[],
  deletedFolderIds: string[] = [],
): Promise<BookmarkFolder[]> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const existingFolders = await fetchUserFolders(userId);
  const existingIds = new Set(existingFolders.map((folder) => folder.id));

  const normalizedDeletedIds = [...new Set(deletedFolderIds)];

  if (
    existingFolders.length - normalizedDeletedIds.length !==
    folderDrafts.length
  ) {
    throw new Error("폴더 목록이 올바르지 않습니다.");
  }

  const trimmedNames = folderDrafts.map((folder) => folder.name.trim());

  if (trimmedNames.some((folderName) => !folderName)) {
    throw new Error("폴더 이름을 입력해 주세요.");
  }

  if (
    trimmedNames.some(
      (folderName) =>
        getFolderNameLength(folderName) > MAX_BOOKMARK_FOLDER_NAME_LENGTH,
    )
  ) {
    throw new Error(
      `폴더 이름은 ${MAX_BOOKMARK_FOLDER_NAME_LENGTH}자 이하로 입력해 주세요.`,
    );
  }

  const pinnedDrafts = folderDrafts.filter((folder) => folder.isDefault);

  if (pinnedDrafts.length !== 1) {
    throw new Error(`${BOOKMARK_PINNED_FOLDER_LABEL}는 1개만 지정할 수 있습니다.`);
  }

  const pinnedFolder = pinnedDrafts[0];

  if (!pinnedFolder) {
    throw new Error(`${BOOKMARK_PINNED_FOLDER_LABEL}를 찾을 수 없습니다.`);
  }

  if (normalizedDeletedIds.includes(pinnedFolder.id)) {
    throw new Error(`${BOOKMARK_PINNED_FOLDER_LABEL}는 삭제할 수 없습니다.`);
  }

  folderDrafts.forEach((folder) => {
    if (!existingIds.has(folder.id)) {
      throw new Error("수정할 수 없는 폴더가 포함되어 있습니다.");
    }
  });

  normalizedDeletedIds.forEach((folderId) => {
    if (!existingIds.has(folderId)) {
      throw new Error("삭제할 수 없는 폴더가 포함되어 있습니다.");
    }
  });

  for (const deletedFolderId of normalizedDeletedIds) {
    const { error: moveError } = await supabase
      .from("bookmarks")
      .update({ folder_id: pinnedFolder.id })
      .eq("user_id", userId)
      .eq("folder_id", deletedFolderId);

    if (moveError) {
      console.error("[updateBookmarkFolders] move", moveError.message);
      throw new Error("삭제할 폴더의 북마크를 옮기지 못했습니다.");
    }

    const { error: deleteError } = await supabase
      .from("bookmark_folders")
      .delete()
      .eq("id", deletedFolderId)
      .eq("user_id", userId)
      .eq("is_default", false);

    if (deleteError) {
      if (isMissingFolderIsDefaultError(deleteError.message)) {
        const { error: legacyDeleteError } = await supabase
          .from("bookmark_folders")
          .delete()
          .eq("id", deletedFolderId)
          .eq("user_id", userId)
          .neq("id", pinnedFolder.id);

        if (legacyDeleteError) {
          console.error("[updateBookmarkFolders] delete", legacyDeleteError.message);
          throw new Error("폴더를 삭제하지 못했습니다.");
        }

        continue;
      }

      console.error("[updateBookmarkFolders] delete", deleteError.message);
      throw new Error("폴더를 삭제하지 못했습니다.");
    }
  }

  const resolvedNames = resolveUniqueFolderNames(trimmedNames);

  const updates = folderDrafts.map((folder, index) => ({
    id: folder.id,
    name: resolvedNames[index] ?? folder.name.trim(),
    sort_order: index,
    is_default: folder.isDefault,
  }));

  // [ERROR FIX] 폴더명·고정 플래그를 한 번에 순차 업데이트하면 UNIQUE 제약 충돌
  // 1) is_default 전부 해제 → 2) 임시 이름 → 3) 이름·순서 저장 → 4) 고정 폴더만 is_default=true
  await clearUserFolderDefaultFlags(userId);
  await stageFolderNamesForRename(
    userId,
    updates.map((update) => update.id),
  );

  for (const update of updates) {
    await applyFolderNameAndSortOrder(userId, {
      id: update.id,
      name: update.name,
      sort_order: update.sort_order,
    });
  }

  await assignPinnedFolderFlag(userId, pinnedFolder.id);

  return fetchUserFolders(userId);
};
