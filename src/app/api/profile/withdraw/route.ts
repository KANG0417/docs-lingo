import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteUserAccount } from "@/services/profile-service";

export const DELETE = async (): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    await deleteUserAccount(session.user.id);
    return NextResponse.json({ message: "회원 탈퇴가 완료되었습니다." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "회원 탈퇴에 실패했습니다.";

    return NextResponse.json({ message }, { status: 400 });
  }
};
