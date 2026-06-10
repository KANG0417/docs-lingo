import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTranslationHistory } from "@/services/translation-service";

export const GET = async (): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const history = await getTranslationHistory(session.user.id);
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
