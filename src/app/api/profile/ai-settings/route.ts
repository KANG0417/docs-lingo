import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserAiSettings,
  updateUserAiSettings,
} from "@/services/ai-settings-service";
import type { UpdateUserAiSettingsPayload } from "@/types/ai-settings";

export const GET = async (): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const settings = await getUserAiSettings(session.user.id);
    return NextResponse.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 설정 조회에 실패했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
};

export const PATCH = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as UpdateUserAiSettingsPayload;

  try {
    const settings = await updateUserAiSettings(session.user.id, body);
    return NextResponse.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 설정 저장에 실패했습니다.";

    return NextResponse.json({ message }, { status: 400 });
  }
};
