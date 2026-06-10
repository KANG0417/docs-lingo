import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserProfile, updateUserProfile } from "@/services/profile-service";
import type { UpdateUserProfilePayload } from "@/types/user";

export const GET = async (): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const profile = await getUserProfile(session.user.id);

  if (!profile) {
    return NextResponse.json(
      { message: "프로필을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json(profile);
};

export const PATCH = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as UpdateUserProfilePayload;

  try {
    const profile = await updateUserProfile(session.user.id, {
      nickname: body.nickname,
      image: body.image ?? null,
    });

    return NextResponse.json(profile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "프로필 수정에 실패했습니다.";

    return NextResponse.json({ message }, { status: 400 });
  }
};
