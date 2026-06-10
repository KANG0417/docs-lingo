import Image from "next/image";
import type { ReactElement } from "react";
import { resolveProfileImage } from "@/constants/profile-image";

type UserAvatarSize = "sm" | "lg";

interface UserAvatarProps {
  nickname: string;
  image: string | null;
  size?: UserAvatarSize;
  className?: string;
}

const SIZE_CONFIG: Record<
  UserAvatarSize,
  { dimension: number; className: string }
> = {
  sm: {
    dimension: 96,
    className: "h-12 w-12 rounded-full border-2 border-amber-300 object-cover",
  },
  lg: {
    dimension: 112,
    className: "h-28 w-28 rounded-full border-2 border-amber-300 object-cover",
  },
};

export const UserAvatar = ({
  nickname,
  image,
  size = "sm",
  className,
}: UserAvatarProps): ReactElement => {
  const { dimension, className: sizeClassName } = SIZE_CONFIG[size];
  const profileImage = resolveProfileImage(image);

  return (
    <Image
      src={profileImage}
      alt={`${nickname} 프로필 이미지`}
      width={dimension}
      height={dimension}
      sizes={size === "sm" ? "48px" : "112px"}
      quality={90}
      className={className ?? sizeClassName}
    />
  );
};
