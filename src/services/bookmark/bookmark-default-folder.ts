import { getSupabaseAdminClient } from "@/lib/supabase/supabase-admin";
import { BOOKMARK_DEFAULT_STORAGE_NAME } from "@/constants/bookmark";
import type { BookmarkFolder } from "@/types/bookmark";

export interface BookmarkFolderRow {
  id: string;
  name: string;
  sort_order?: number | null;
  is_default?: boolean | null;
  created_at: string;
}

export const mapFolderRow = (
  row: BookmarkFolderRow,
  index: number,
  isDefaultOverride?: boolean,
): BookmarkFolder => {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order ?? index,
    isDefault: isDefaultOverride ?? Boolean(row.is_default),
    createdAt: row.created_at,
  };
};

export const isMissingFolderSortOrderError = (message: string): boolean => {
  return message.toLowerCase().includes("sort_order");
};

export const isMissingFolderIsDefaultError = (message: string): boolean => {
  return message.toLowerCase().includes("is_default");
};

const isMissingFolderIdColumnError = (message: string): boolean => {
  return message.toLowerCase().includes("folder_id");
};

const isMissingFolderColumnError = (message: string): boolean => {
  return (
    isMissingFolderSortOrderError(message) ||
    isMissingFolderIsDefaultError(message)
  );
};

export const isUniqueViolationError = (message: string): boolean => {
  const loweredMessage = message.toLowerCase();

  return (
    loweredMessage.includes("duplicate key") ||
    loweredMessage.includes("unique constraint") ||
    loweredMessage.includes("23505")
  );
};

export const FOLDER_SELECT_FULL = "id, name, sort_order, is_default, created_at";
const FOLDER_SELECT_LEGACY = "id, name, created_at";

const queryUserFolderRows = async (
  userId: string,
): Promise<BookmarkFolderRow[]> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data, error } = await supabase
    .from("bookmark_folders")
    .select(FOLDER_SELECT_FULL)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!error) {
    return (data ?? []) as BookmarkFolderRow[];
  }

  if (
    !isMissingFolderSortOrderError(error.message) &&
    !isMissingFolderIsDefaultError(error.message)
  ) {
    throw new Error(error.message);
  }

  const legacyResult = await supabase
    .from("bookmark_folders")
    .select(FOLDER_SELECT_LEGACY)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (legacyResult.error) {
    throw new Error(legacyResult.error.message);
  }

  return ((legacyResult.data ?? []) as BookmarkFolderRow[]).map((row, index) => ({
    ...row,
    sort_order: index,
    is_default: index === 0 && row.name === BOOKMARK_DEFAULT_STORAGE_NAME,
  }));
};

const migrateNullFolderBookmarks = async (
  userId: string,
  defaultFolderId: string,
): Promise<void> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { error } = await supabase
    .from("bookmarks")
    .update({ folder_id: defaultFolderId })
    .eq("user_id", userId)
    .is("folder_id", null);

  if (error) {
    if (isMissingFolderIdColumnError(error.message)) {
      return;
    }

    console.error("[migrateNullFolderBookmarks]", error.message);
    throw new Error("기본 저장소로 북마크를 옮기지 못했습니다.");
  }
};

const fetchDefaultFolderRowByName = async (
  userId: string,
): Promise<BookmarkFolderRow | null> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data, error } = await supabase
    .from("bookmark_folders")
    .select(FOLDER_SELECT_LEGACY)
    .eq("user_id", userId)
    .eq("name", BOOKMARK_DEFAULT_STORAGE_NAME)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BookmarkFolderRow;
};

const insertDefaultBookmarkFolderRow = async (
  userId: string,
): Promise<BookmarkFolderRow> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const payloadVariants: Array<Record<string, string | number | boolean>> = [
    {
      user_id: userId,
      name: BOOKMARK_DEFAULT_STORAGE_NAME,
      sort_order: 0,
      is_default: true,
    },
    {
      user_id: userId,
      name: BOOKMARK_DEFAULT_STORAGE_NAME,
      sort_order: 0,
    },
    {
      user_id: userId,
      name: BOOKMARK_DEFAULT_STORAGE_NAME,
    },
  ];

  let lastErrorMessage: string | null = null;

  for (const payload of payloadVariants) {
    const { data, error } = await supabase
      .from("bookmark_folders")
      .insert(payload)
      .select(FOLDER_SELECT_LEGACY)
      .single();

    if (!error && data) {
      return data as BookmarkFolderRow;
    }

    lastErrorMessage = error?.message ?? "알 수 없는 오류";

    if (isUniqueViolationError(lastErrorMessage)) {
      const existingFolder = await fetchDefaultFolderRowByName(userId);

      if (existingFolder) {
        return existingFolder;
      }

      break;
    }

    if (!isMissingFolderColumnError(lastErrorMessage)) {
      break;
    }
  }

  const existingFolder = await fetchDefaultFolderRowByName(userId);

  if (existingFolder) {
    return existingFolder;
  }

  console.error("[insertDefaultBookmarkFolderRow]", lastErrorMessage);
  throw new Error("기본 저장소를 만들지 못했습니다.");
};

const ensureDefaultBookmarkFolder = async (
  userId: string,
): Promise<BookmarkFolder> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const folderRows = await queryUserFolderRows(userId);
  const existingDefault = folderRows.find((row) => row.is_default);

  if (existingDefault) {
    const defaultFolder = mapFolderRow(existingDefault, 0, true);
    await migrateNullFolderBookmarks(userId, defaultFolder.id);
    return defaultFolder;
  }

  const legacyDefault = folderRows.find(
    (row) => row.name === BOOKMARK_DEFAULT_STORAGE_NAME,
  );

  if (legacyDefault) {
    const { error: legacyUpdateError } = await supabase
      .from("bookmark_folders")
      .update({ is_default: true, sort_order: legacyDefault.sort_order ?? 0 })
      .eq("id", legacyDefault.id)
      .eq("user_id", userId);

    if (
      legacyUpdateError &&
      !isMissingFolderColumnError(legacyUpdateError.message)
    ) {
      console.error("[ensureDefaultBookmarkFolder] legacy update", legacyUpdateError.message);
    }

    const defaultFolder = mapFolderRow(legacyDefault, 0, true);
    await migrateNullFolderBookmarks(userId, defaultFolder.id);
    return defaultFolder;
  }

  const insertedRow = await insertDefaultBookmarkFolderRow(userId);
  const defaultFolder = mapFolderRow(insertedRow, 0, true);
  await migrateNullFolderBookmarks(userId, defaultFolder.id);
  return defaultFolder;
};

export const fetchUserFolders = async (
  userId: string,
): Promise<BookmarkFolder[]> => {
  await ensureDefaultBookmarkFolder(userId);
  const folderRows = await queryUserFolderRows(userId);

  if (folderRows.some((row) => row.is_default)) {
    return folderRows.map((row, index) =>
      mapFolderRow(row, index, Boolean(row.is_default)),
    );
  }

  const defaultFolder = await ensureDefaultBookmarkFolder(userId);
  const refreshedRows = await queryUserFolderRows(userId);

  return refreshedRows.map((row, index) =>
    mapFolderRow(row, index, row.id === defaultFolder.id),
  );
};

export const countCustomUserFolders = async (
  userId: string,
): Promise<number> => {
  const folders = await fetchUserFolders(userId);
  return folders.filter((folder) => !folder.isDefault).length;
};

export const getDefaultFolderId = async (userId: string): Promise<string> => {
  const defaultFolder = await ensureDefaultBookmarkFolder(userId);
  return defaultFolder.id;
};
