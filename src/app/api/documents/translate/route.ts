import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";
import {
  getTranslationErrorStatus,
  toTranslationError,
} from "@/lib/translation/translation-errors";
import { normalizeDocumentUrl } from "@/lib/document/normalize-document-url";
import {
  translateDocumentFromText,
  translateDocumentFromUrl,
} from "@/services/translation-service";

export const POST = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { url, text } = (await request.json()) as {
    url?: string;
    text?: string;
  };

  const trimmedText = text?.trim() ?? "";
  const trimmedUrl = url?.trim() ?? "";

  if (!trimmedUrl && !trimmedText) {
    return NextResponse.json(
      { message: "url 또는 text를 입력해주세요." },
      { status: 400 },
    );
  }

  if (trimmedUrl && trimmedText) {
    return NextResponse.json(
      { message: "url과 text는 동시에 입력할 수 없습니다." },
      { status: 400 },
    );
  }

  if (trimmedUrl) {
    try {
      const targetUrl = new URL(trimmedUrl);
      if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
        return NextResponse.json(
          { message: "http 또는 https 주소만 지원합니다." },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { message: "유효한 URL 형식이 아닙니다." },
        { status: 400 },
      );
    }
  }

  try {
    const result = trimmedText
      ? await translateDocumentFromText(
          session.user.id,
          trimmedText,
          session.user.name,
        )
      : await translateDocumentFromUrl(
          session.user.id,
          normalizeDocumentUrl(trimmedUrl),
          session.user.name,
        );

    return NextResponse.json(result);
  } catch (error) {
    const translationError = toTranslationError(error);

    console.error(
      "[POST /api/documents/translate]",
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
