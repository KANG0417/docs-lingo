import { getUserProfile } from "@/services/profile-service";
import type { Session } from "next-auth";

interface DisplayProfile {
  nickname: string;
  image: string | null;
}

export const getDisplayProfile = async (
  session: Session,
): Promise<DisplayProfile> => {
  if (!session.user?.id) {
    return {
      nickname: session.user?.name ?? "사용자",
      image: session.user?.image ?? null,
    };
  }

  const profile = await getUserProfile(session.user.id);

  if (profile) {
    return {
      nickname: profile.nickname,
      image: profile.image,
    };
  }

  return {
    nickname: session.user.name ?? "사용자",
    image: session.user.image ?? null,
  };
};
