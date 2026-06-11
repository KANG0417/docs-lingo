import { redirect } from "next/navigation";
import { AUTH_FORCE_SIGNOUT_PATH } from "@/constants/auth";
import { getUserProfileOrEnsure } from "@/services/profile-service";
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
      nickname: session.user?.name ?? "독스리더",
      image: session.user?.image ?? null,
    };
  }

  const profile = await getUserProfileOrEnsure(
    session.user.id,
    session.user.name ?? "독스리더",
  );

  if (!profile) {
    redirect(AUTH_FORCE_SIGNOUT_PATH);
  }

  return {
    nickname: profile.nickname,
    image: profile.image,
  };
};
