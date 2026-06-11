import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  cancelAccountWithdrawal,
  getUserProfile,
  scheduleAccountWithdrawal,
} from "@/services/profile-service";
import type { WithdrawalStatus } from "@/types/user";

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

  const status: WithdrawalStatus = {
    scheduledAt: profile.withdrawalScheduledAt,
  };

  return NextResponse.json(status);
};

export const POST = async (): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const profile = await getUserProfile(session.user.id);

    if (!profile) {
      return NextResponse.json(
        { message: "프로필을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (profile.withdrawalScheduledAt) {
      return NextResponse.json(
        { message: "이미 탈퇴 예약이 진행 중입니다." },
        { status: 400 },
      );
    }

    const scheduledAt = await scheduleAccountWithdrawal(session.user.id);

    return NextResponse.json({
      scheduledAt,
      message: "탈퇴가 예약되었습니다. 24시간 이내 취소하지 않으면 탈퇴가 완료됩니다.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "탈퇴 예약에 실패했습니다.";

    return NextResponse.json({ message }, { status: 400 });
  }
};

export const DELETE = async (): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    await cancelAccountWithdrawal(session.user.id);

    return NextResponse.json({
      message: "탈퇴 예약이 취소되었습니다.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "탈퇴 예약 취소에 실패했습니다.";

    return NextResponse.json({ message }, { status: 400 });
  }
};
