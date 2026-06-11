import {
  PROFILE_IMAGE_ALLOWED_MIME_TYPES,
  PROFILE_IMAGE_MAX_SIZE_BYTES,
} from "@/constants/profile-storage";

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export const validateProfileImageClient = (file: File): string | null => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const resolvedMimeType =
    file.type ||
    (extension in EXTENSION_TO_MIME ? EXTENSION_TO_MIME[extension] : "");

  if (
    !PROFILE_IMAGE_ALLOWED_MIME_TYPES.includes(
      resolvedMimeType as (typeof PROFILE_IMAGE_ALLOWED_MIME_TYPES)[number],
    )
  ) {
    return "JPG, PNG, WEBP, GIF 형식의 이미지만 선택할 수 있습니다.";
  }

  if (file.size > PROFILE_IMAGE_MAX_SIZE_BYTES) {
    return "프로필 이미지는 5MB 이하만 선택할 수 있습니다.";
  }

  return null;
};
