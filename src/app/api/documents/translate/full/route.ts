import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

import {
  getTranslationErrorStatus,
  toTranslationError,
} from "@/lib/translation/translation-errors";
import { getFullTranslationSource } from "@/services/translation/translation-history-service";
import { persistFullTranslationContent } from "@/services/translation/translation-persistence-service";
import { getUserAiCredentials } from "@/services/ai-settings-service";
import { translateDocumentFullTextWithClaude } from "@/services/claude-full-translation-service";

const isPersistedTranslationId = (translationId: string): boolean => {
  return !translationId.startsWith("local-");
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { translationId, originalContent } = (await request.json()) as {
    translationId?: string;
    originalContent?: string;
  };

  const trimmedTranslationId = translationId?.trim() ?? "";

  if (!trimmedTranslationId) {
    return NextResponse.json(
      { message: "translationId를 입력해주세요." },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  const canPersist = isPersistedTranslationId(trimmedTranslationId);

  try {
    let sourceContent = originalContent?.trim() ?? "";

    if (canPersist) {
      const source = await getFullTranslationSource(userId, trimmedTranslationId);

      if (source?.cachedFullContent) {
        return NextResponse.json({
          translatedFullContent: source.cachedFullContent,
        });
      }

      if (source?.originalContent) {
        sourceContent = source.originalContent;
      }
    }

    if (!sourceContent) {
      return NextResponse.json(
        { message: "번역할 원문을 찾지 못했습니다." },
        { status: 400 },
      );
    }

    const userAiCredentials = await getUserAiCredentials(userId);
    const translatedFullContent = await translateDocumentFullTextWithClaude(
      sourceContent,
      userAiCredentials,
    );

    if (canPersist) {
      await persistFullTranslationContent(
        userId,
        trimmedTranslationId,
        translatedFullContent,
      );
    }

    return NextResponse.json({ translatedFullContent });
  } catch (error) {
    const translationError = toTranslationError(error);

    console.error(
      "[POST /api/documents/translate/full]",
      translationError.code,
      translationError.originalMessage,
    );

    return NextResponse.json(
      {
        message: translationError.message,
        code: translationError.code,
      },
      { status: getTranslationErrorStatus(translationError) },
    );
  }
};
