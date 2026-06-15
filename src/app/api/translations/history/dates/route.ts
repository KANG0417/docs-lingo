import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getTranslationHistoryDateKeys } from "@/services/translation-service";

export const GET = async (): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const dateKeys = await getTranslationHistoryDateKeys(session.user.id);

    return NextResponse.json({ dateKeys });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "번역 히스토리 날짜를 불러오지 못했습니다.";

    console.error("[GET /api/translations/history/dates]", message);

    return NextResponse.json({ message }, { status: 500 });
  }
};
