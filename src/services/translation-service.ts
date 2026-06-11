import { processRefinedDocument } from "@/lib/document-ai-processor";
import { refineDocumentFromText } from "@/lib/document-pipeline/refine-document-from-text";
import { refineDocumentFromUrl } from "@/lib/document-pipeline/refine-document";
import { isPaginationDocumentUrl } from "@/lib/normalize-document-url";
import { getTranslationDayRange } from "@/lib/translation-day-range";
import {
  isValidHistoryDateKey,
} from "@/lib/translation-history-date";
import { HISTORY_PAGE_SIZE } from "@/constants/translation-history";
import {
  TranslationError,
  toTranslationError,
} from "@/lib/translation-errors";
import { ensureUserProfileExists } from "@/services/profile-service";
import { getUserAiCredentials } from "@/services/ai-settings-service";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type {
  DocumentTranslationResult,
  KeywordTerm,
  TranslationHistoryItem,
  TranslationHistoryQuery,
  TranslationHistoryResponse,
} from "@/types/translation";

interface SaveTranslationParams {
  userId: string;
  url: string;
  title: string;
  originalContent: string;
  translatedContent: string;
  summaryTerms: KeywordTerm[];
}

interface DocumentRow {
  id: string;
  title: string | null;
  url: string;
}

interface TranslationRow {
  id: string;
  document_id: string;
  content: string;
  original_content: string | null;
  summary_terms: KeywordTerm[] | null;
  created_at: string;
  documents: DocumentRow | DocumentRow[] | null;
}

const resolveDocumentRow = (
  documents: DocumentRow | DocumentRow[] | null,
): DocumentRow | null => {
  if (!documents) return null;
  return Array.isArray(documents) ? (documents[0] ?? null) : documents;
};

const mapHistoryItem = (row: TranslationRow): TranslationHistoryItem => {
  const document = resolveDocumentRow(row.documents);

  return {
    id: row.id,
    documentId: row.document_id,
    title: document?.title ?? "제목 없음",
    url: document?.url ?? null,
    originalContent: row.original_content,
    translatedContent: row.content,
    summaryTerms: row.summary_terms ?? [],
    createdAt: row.created_at,
  };
};

export const saveTranslation = async ({
  userId,
  url,
  title,
  originalContent,
  translatedContent,
  summaryTerms,
}: SaveTranslationParams): Promise<DocumentTranslationResult> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data: documentRow, error: documentError } = await supabase
    .from("documents")
    .upsert(
      {
        url,
        title,
      },
      { onConflict: "url" },
    )
    .select("id, title, url")
    .single();

  if (documentError || !documentRow) {
    console.error("[saveTranslation] document", documentError?.message);
    throw new Error("문서 저장에 실패했습니다.");
  }

  const { startIso, endIso } = getTranslationDayRange();

  const { data: existingTodayTranslation } = await supabase
    .from("translations")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("document_id", documentRow.id)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const persistTranslation = async (
    includeExtendedColumns: boolean,
  ): Promise<{ id: string; created_at: string } | null> => {
    const basePayload = {
      user_id: userId,
      document_id: documentRow.id,
      content: translatedContent,
      source_lang: "en",
      target_lang: "ko",
    };

    const payload = includeExtendedColumns
      ? {
          ...basePayload,
          summary_terms: summaryTerms,
          original_content: originalContent,
        }
      : basePayload;

    if (existingTodayTranslation) {
      const { data, error } = await supabase
        .from("translations")
        .update(payload)
        .eq("id", existingTodayTranslation.id)
        .select("id, created_at")
        .single();

      if (error) {
        console.error("[saveTranslation] translation update", error.message);
        return null;
      }

      return data;
    }

    const { data, error } = await supabase
      .from("translations")
      .insert(payload)
      .select("id, created_at")
      .single();

    if (error) {
      console.error("[saveTranslation] translation insert", error.message);
      return null;
    }

    return data;
  };

  let translationRow = await persistTranslation(true);

  if (!translationRow) {
    translationRow = await persistTranslation(false);
  }

  if (!translationRow) {
    throw new Error(
      "번역 히스토리 저장에 실패했습니다.\nSupabase SQL Editor에서 supabase/migrations/20260610-translations-history.sql 을 실행해 주세요.",
    );
  }

  return {
    id: translationRow.id,
    documentId: documentRow.id,
    title: documentRow.title ?? title,
    url: documentRow.url,
    originalContent,
    translatedContent,
    summaryTerms,
    createdAt: translationRow.created_at,
  };
};

const translateRefinedDocument = async (
  userId: string,
  refinedDocument: {
    title: string;
    url: string;
    originalContent: string;
    aiInput: string;
  },
): Promise<DocumentTranslationResult> => {
  const userAiCredentials = await getUserAiCredentials(userId);

  let processedDocument: Awaited<ReturnType<typeof processRefinedDocument>>;

  try {
    processedDocument = await processRefinedDocument(
      refinedDocument.title,
      refinedDocument.originalContent,
      refinedDocument.aiInput,
      userAiCredentials,
    );
  } catch (error) {
    throw toTranslationError(error);
  }

  const { translatedContent, summaryTerms } = processedDocument;

  if (isPaginationDocumentUrl(refinedDocument.url)) {
    return {
      id: "local-pagination",
      documentId: "local-pagination",
      title: refinedDocument.title,
      url: refinedDocument.url,
      originalContent: refinedDocument.originalContent,
      translatedContent,
      summaryTerms,
      createdAt: new Date().toISOString(),
    };
  }

  return saveTranslation({
    userId,
    url: refinedDocument.url,
    title: refinedDocument.title,
    originalContent: refinedDocument.originalContent,
    translatedContent,
    summaryTerms,
  });
};

export const translateDocumentFromUrl = async (
  userId: string,
  url: string,
  userNickname?: string | null,
): Promise<DocumentTranslationResult> => {
  await ensureUserProfileExists(userId, userNickname?.trim() || "사용자");

  let refinedDocument: Awaited<ReturnType<typeof refineDocumentFromUrl>>;

  try {
    refinedDocument = await refineDocumentFromUrl(url);
  } catch (error) {
    throw toTranslationError(error);
  }

  return translateRefinedDocument(userId, refinedDocument);
};

export const translateDocumentFromText = async (
  userId: string,
  text: string,
  userNickname?: string | null,
): Promise<DocumentTranslationResult> => {
  await ensureUserProfileExists(userId, userNickname?.trim() || "사용자");

  let refinedDocument: ReturnType<typeof refineDocumentFromText>;

  try {
    refinedDocument = refineDocumentFromText(text);
  } catch (error) {
    throw toTranslationError(error);
  }

  return translateRefinedDocument(userId, refinedDocument);
};

const HISTORY_SELECT_FULL =
  "id, document_id, content, original_content, summary_terms, created_at, documents(id, title, url)";

const HISTORY_SELECT_LEGACY =
  "id, document_id, content, created_at, documents(id, title, url)";

const isMissingHistoryColumnError = (message: string): boolean => {
  const loweredMessage = message.toLowerCase();
  return (
    loweredMessage.includes("original_content") ||
    loweredMessage.includes("summary_terms")
  );
};

const fetchHistoryRows = async (
  userId: string,
  selectClause: string,
  dateKey: string,
  page: number,
  pageSize: number,
): Promise<{ rows: TranslationRow[]; totalCount: number }> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { startIso, endIso } = getTranslationDayRange(
    new Date(`${dateKey}T12:00:00+09:00`),
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const countQuery = await supabase
    .from("translations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (countQuery.error) {
    throw new Error(countQuery.error.message);
  }

  const dataQuery = await supabase
    .from("translations")
    .select(selectClause)
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (dataQuery.error) {
    throw new Error(dataQuery.error.message);
  }

  return {
    rows: (dataQuery.data ?? []) as unknown as TranslationRow[],
    totalCount: countQuery.count ?? 0,
  };
};

export const getTranslationHistory = async (
  userId: string,
  query: TranslationHistoryQuery = {},
): Promise<TranslationHistoryResponse> => {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? HISTORY_PAGE_SIZE);
  const dateKey =
    query.dateKey && isValidHistoryDateKey(query.dateKey)
      ? query.dateKey
      : getTranslationDayRange().dateKey;

  try {
    const fullResult = await fetchHistoryRows(
      userId,
      HISTORY_SELECT_FULL,
      dateKey,
      page,
      pageSize,
    );

    const totalPages = Math.max(1, Math.ceil(fullResult.totalCount / pageSize));

    return {
      items: fullResult.rows.map(mapHistoryItem),
      totalCount: fullResult.totalCount,
      page,
      pageSize,
      totalPages,
      dateKey,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (!isMissingHistoryColumnError(message)) {
      console.error("[getTranslationHistory]", message);
      throw new Error(message || "번역 히스토리를 불러오지 못했습니다.");
    }
  }

  try {
    const legacyResult = await fetchHistoryRows(
      userId,
      HISTORY_SELECT_LEGACY,
      dateKey,
      page,
      pageSize,
    );

    const totalPages = Math.max(1, Math.ceil(legacyResult.totalCount / pageSize));

    return {
      items: legacyResult.rows.map((row) =>
        mapHistoryItem({
          ...row,
          original_content: null,
          summary_terms: [],
        } as TranslationRow),
      ),
      totalCount: legacyResult.totalCount,
      page,
      pageSize,
      totalPages,
      dateKey,
    };
  } catch (legacyError) {
    const legacyMessage =
      legacyError instanceof Error ? legacyError.message : "";

    throw new Error(
      legacyMessage ||
        "번역 히스토리 테이블 마이그레이션이 필요합니다.\nSupabase SQL Editor에서 supabase/migrations/20260610-translations-history.sql 을 실행해 주세요.",
    );
  }
};

export const getTranslationById = async (
  userId: string,
  translationId: string,
): Promise<TranslationHistoryItem | null> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("translations")
    .select(
      "id, document_id, content, original_content, summary_terms, created_at, documents(id, title, url)",
    )
    .eq("user_id", userId)
    .eq("id", translationId)
    .maybeSingle();

  if (error || !data) return null;

  return mapHistoryItem(data as unknown as TranslationRow);
};
