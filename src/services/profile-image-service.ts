import {
  PROFILE_IMAGE_ALLOWED_MIME_TYPES,
  PROFILE_IMAGE_BUCKET,
  PROFILE_IMAGE_MAX_SIZE_BYTES,
  type ProfileImageMimeType,
} from "@/constants/profile-storage";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const MIME_TO_EXTENSION: Record<ProfileImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

interface UploadProfileImageParams {
  userId: string;
  fileBuffer: Buffer;
  contentType: ProfileImageMimeType;
  previousImageUrl?: string | null;
}

const getExtensionFromMimeType = (
  contentType: ProfileImageMimeType,
): string => {
  return MIME_TO_EXTENSION[contentType];
};

const isProfileImageMimeType = (
  contentType: string,
): contentType is ProfileImageMimeType => {
  return (PROFILE_IMAGE_ALLOWED_MIME_TYPES as readonly string[]).includes(
    contentType,
  );
};

const getStoragePathFromPublicUrl = (imageUrl: string): string | null => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const publicPrefix = `${supabaseUrl}/storage/v1/object/public/${PROFILE_IMAGE_BUCKET}/`;
  if (!imageUrl.startsWith(publicPrefix)) return null;

  return imageUrl.slice(publicPrefix.length);
};

export const validateProfileImageFile = (
  file: File,
): { contentType: ProfileImageMimeType } => {
  if (!isProfileImageMimeType(file.type)) {
    throw new Error("JPG, PNG, WEBP, GIF 형식의 이미지만 업로드할 수 있습니다.");
  }

  if (file.size > PROFILE_IMAGE_MAX_SIZE_BYTES) {
    throw new Error("프로필 이미지는 5MB 이하만 업로드할 수 있습니다.");
  }

  return { contentType: file.type };
};

export const deleteProfileImageByUrl = async (
  imageUrl: string | null | undefined,
): Promise<void> => {
  if (!imageUrl) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const storagePath = getStoragePathFromPublicUrl(imageUrl);
  if (!storagePath) return;

  await supabase.storage.from(PROFILE_IMAGE_BUCKET).remove([storagePath]);
};

export const uploadProfileImage = async ({
  userId,
  fileBuffer,
  contentType,
  previousImageUrl,
}: UploadProfileImageParams): Promise<string> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const extension = getExtensionFromMimeType(contentType);
  const storagePath = `${userId}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error("프로필 이미지 업로드에 실패했습니다.");
  }

  if (previousImageUrl) {
    const previousPath = getStoragePathFromPublicUrl(previousImageUrl);
    if (previousPath && previousPath !== storagePath) {
      await supabase.storage.from(PROFILE_IMAGE_BUCKET).remove([previousPath]);
    }
  }

  const { data } = supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
};

export const deleteUserProfileImages = async (userId: string): Promise<void> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .list(userId);

  if (error || !data?.length) return;

  const filePaths = data.map((file) => `${userId}/${file.name}`);
  await supabase.storage.from(PROFILE_IMAGE_BUCKET).remove(filePaths);
};
