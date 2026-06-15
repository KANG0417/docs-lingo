import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { moveBookmarkToFolder } from "@/services/bookmark-service";
import type { MoveBookmarkPayload } from "@/types/bookmark";

export const PATCH = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: MoveBookmarkPayload;

  try {
    body = (await request.json()) as MoveBookmarkPayload;
  } catch {
    return NextResponse.json(
      { message: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (!body.documentId) {
    return NextResponse.json(
      { message: "documentId가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    await moveBookmarkToFolder(
      session.user.id,
      body.documentId,
      body.folderId ?? null,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "북마크를 이동하지 못했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
};
