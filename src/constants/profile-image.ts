export const DEFAULT_PROFILE_IMAGE = "/images/user/public_user_icon.png";

export const resolveProfileImage = (
  image: string | null | undefined,
): string => {
  const trimmedImage = image?.trim();
  return trimmedImage ? trimmedImage : DEFAULT_PROFILE_IMAGE;
};
