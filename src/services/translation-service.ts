import { processRefinedDocument } from "@/lib/document-ai-processor";
import { refineDocumentFromUrl } from "@/lib/document-pipeline/refine-document";
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

  const insertTranslation = async (
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

    const { data, error } = await supabase
      .from("translations")
      .insert(payload)
      .select("id, created_at")
      .single();

    if (error) {
      console.error("[saveTranslation] translation", error.message);
      return null;
    }

    return data;
  };

  let translationRow = await insertTranslation(true);

  if (!translationRow) {
    translationRow = await insertTranslation(false);
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

  return saveTranslation({
    userId,
    url: refinedDocument.url,
    title: refinedDocument.title,
    originalContent: refinedDocument.originalContent,
    translatedContent,
    summaryTerms,
  });
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

export const getTranslationHistory = async (
  userId: string,
): Promise<TranslationHistoryItem[]> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const fullQuery = await supabase
    .from("translations")
    .select(HISTORY_SELECT_FULL)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!fullQuery.error && fullQuery.data) {
    return (fullQuery.data as unknown as TranslationRow[]).map(mapHistoryItem);
  }

  if (
    fullQuery.error &&
    isMissingHistoryColumnError(fullQuery.error.message)
  ) {
    const legacyQuery = await supabase
      .from("translations")
      .select(HISTORY_SELECT_LEGACY)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!legacyQuery.error && legacyQuery.data) {
      return (legacyQuery.data as unknown as TranslationRow[]).map(
        (row) =>
          mapHistoryItem({
            ...row,
            original_content: null,
            summary_terms: [],
          } as TranslationRow),
      );
    }

    throw new Error(
      "번역 히스토리 테이블 마이그레이션이 필요합니다.\nSupabase SQL Editor에서 supabase/migrations/20260610-translations-history.sql 을 실행해 주세요.",
    );
  }

  console.error("[getTranslationHistory]", fullQuery.error?.message);

  throw new Error(
    fullQuery.error?.message ?? "번역 히스토리를 불러오지 못했습니다.",
  );
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
