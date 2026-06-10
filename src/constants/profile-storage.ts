export const PROFILE_IMAGE_BUCKET = "profile-images";

export const PROFILE_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const PROFILE_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ProfileImageMimeType =
  (typeof PROFILE_IMAGE_ALLOWED_MIME_TYPES)[number];
