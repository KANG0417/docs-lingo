import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { deleteTranslation } from "@/services/translation-service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ translationId: string }>;
}

export const DELETE = async (
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { translationId } = await context.params;

  if (!translationId?.trim()) {
    return NextResponse.json(
      { message: "삭제할 번역 ID가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    await deleteTranslation(session.user.id, translationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "번역 히스토리 삭제에 실패했습니다.";

    console.error("[DELETE /api/translations/history/[translationId]]", message);

    const status = message.includes("찾지 못했습니다") ? 404 : 500;

    return NextResponse.json({ message }, { status });
  }
};
