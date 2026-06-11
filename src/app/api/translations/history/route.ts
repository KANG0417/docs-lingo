import { NextResponse } from "next/server";
import { HISTORY_PAGE_SIZE } from "@/constants/translation-history";
import { auth } from "@/lib/auth";
import { getTranslationHistory } from "@/services/translation-service";

export const GET = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const dateKey = searchParams.get("date") ?? undefined;
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(
    searchParams.get("pageSize") ?? String(HISTORY_PAGE_SIZE),
    10,
  );

  try {
    const history = await getTranslationHistory(session.user.id, {
      dateKey,
      page: Number.isNaN(page) ? 1 : page,
      pageSize: Number.isNaN(pageSize) ? HISTORY_PAGE_SIZE : pageSize,
    });

    return NextResponse.json(history);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "번역 히스토리를 불러오지 못했습니다.";

    console.error("[GET /api/translations/history]", message);

    return NextResponse.json({ message }, { status: 500 });
  }
};
