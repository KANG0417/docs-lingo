import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  uploadProfileImage,
  validateProfileImageFile,
} from "@/services/profile-image-service";
import { getUserProfile } from "@/services/profile-service";

export const POST = async (request: Request): Promise<NextResponse> => {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const imageFile = formData.get("image");

  if (!(imageFile instanceof File)) {
    return NextResponse.json(
      { message: "업로드할 이미지 파일이 없습니다." },
      { status: 400 },
    );
  }

  try {
    const { contentType } = validateProfileImageFile(imageFile);
    const fileBuffer = Buffer.from(await imageFile.arrayBuffer());

    const currentProfile = await getUserProfile(session.user.id);

    const imageUrl = await uploadProfileImage({
      userId: session.user.id,
      fileBuffer,
      contentType,
      previousImageUrl: currentProfile?.image,
    });

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "프로필 이미지 업로드에 실패했습니다.";

    return NextResponse.json({ message }, { status: 400 });
  }
};
