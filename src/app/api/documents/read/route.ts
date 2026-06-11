import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { refineDocumentFromUrl } from "@/lib/document-pipeline/refine-document";
import { toTranslationError } from "@/lib/translation/translation-errors";
import type { DocumentContent } from "@/types/document";

export const runtime = "nodejs";

export const POST = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user) {
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
    const refinedDocument = await refineDocumentFromUrl(url);

    const document: DocumentContent = {
      title: refinedDocument.title,
      content: refinedDocument.originalContent,
      url: refinedDocument.url,
    };

    return NextResponse.json(document);
  } catch (error) {
    const translationError = toTranslationError(error);

    return NextResponse.json(
      { message: translationError.message },
      { status: 502 },
    );
  }
};
