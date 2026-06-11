import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { ProfileSection } from "@/components/organisms/profile/profile-section";
import { Navbar } from "@/components/organisms/header/navbar";
import { DashboardTemplate } from "@/components/templates/dashboard/dashboard-template";
import { auth } from "@/lib/auth/auth";
import { getDisplayProfile } from "@/lib/profile/get-display-profile";
import { getUserProfileOrEnsure } from "@/services/profile-service";

export const metadata: Metadata = {
  title: "독스링고 - 개인정보 변경",
  description: "닉네임과 프로필 이미지를 관리하세요.",
};

const ProfilePage = async (): Promise<ReactElement> => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const displayProfile = await getDisplayProfile(session);
  const profile = await getUserProfileOrEnsure(
    session.user.id,
    session.user.name ?? "사용자",
  );

  if (!profile) {
    redirect("/api/auth/force-signout");
  }

  return (
    <DashboardTemplate
      navbarSlot={
        <Navbar
          nickname={displayProfile.nickname}
          image={displayProfile.image}
        />
      }
    >
      <ProfileSection profile={profile} />
    </DashboardTemplate>
  );
};

export default ProfilePage;
