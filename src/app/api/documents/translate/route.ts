import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
import {
  getTranslationErrorStatus,
  toTranslationError,
} from "@/lib/translation-errors";
import { translateDocumentFromUrl } from "@/services/translation-service";

export const POST = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { url } = (await request.json()) as { url?: string };

  if (!url) {
    return NextResponse.json(
      { message: "url을 입력해주세요." },
      { status: 400 },
    );
  }

  try {
    const targetUrl = new URL(url);
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

  try {
    const result = await translateDocumentFromUrl(session.user.id, url);
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
