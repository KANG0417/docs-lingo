import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  addDocumentBookmark,
  getDocumentBookmarkStatus,
  removeDocumentBookmark,
} from "@/services/bookmark/bookmark-item-service";
import { getUserBookmarks } from "@/services/bookmark/bookmark-list-service";
import type { ToggleDocumentBookmarkPayload } from "@/types/bookmark";

export const GET = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const documentId = new URL(request.url).searchParams.get("documentId");

  if (!documentId) {
    try {
      const bookmarks = await getUserBookmarks(session.user.id);
      return NextResponse.json(bookmarks);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "북마크 목록을 불러오지 못했습니다.";

      return NextResponse.json({ message }, { status: 500 });
    }
  }

  try {
    const status = await getDocumentBookmarkStatus(session.user.id, documentId);
    return NextResponse.json(status);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "북마크 상태를 불러오지 못했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: ToggleDocumentBookmarkPayload;

  try {
    body = (await request.json()) as ToggleDocumentBookmarkPayload;
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
    const status = await addDocumentBookmark(session.user.id, body.documentId);
    return NextResponse.json(status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "북마크 추가에 실패했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
};

export const DELETE = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const documentId = new URL(request.url).searchParams.get("documentId");

  if (!documentId) {
    return NextResponse.json(
      { message: "documentId가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const status = await removeDocumentBookmark(session.user.id, documentId);
    return NextResponse.json(status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "북마크 삭제에 실패했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
};
