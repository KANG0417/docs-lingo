import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { createBookmarkFolder, updateBookmarkFolders } from "@/services/bookmark/bookmark-folder-service";
import type {
  CreateBookmarkFolderPayload,
  UpdateBookmarkFoldersPayload,
} from "@/types/bookmark";

export const POST = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: CreateBookmarkFolderPayload;

  try {
    body = (await request.json()) as CreateBookmarkFolderPayload;
  } catch {
    return NextResponse.json(
      { message: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (!body.name?.trim()) {
    return NextResponse.json(
      { message: "폴더 이름을 입력해 주세요." },
      { status: 400 },
    );
  }

  try {
    const folder = await createBookmarkFolder(session.user.id, body.name);
    return NextResponse.json(folder);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "폴더를 만들지 못했습니다.";

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

  let body: UpdateBookmarkFoldersPayload;

  try {
    body = (await request.json()) as UpdateBookmarkFoldersPayload;
  } catch {
    return NextResponse.json(
      { message: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.folders)) {
    return NextResponse.json(
      { message: "folders 배열이 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const folders = await updateBookmarkFolders(
      session.user.id,
      body.folders,
      body.deletedFolderIds ?? [],
    );
    return NextResponse.json({ folders });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "폴더를 수정하지 못했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
};
