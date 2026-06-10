import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { AiSettingsSection } from "@/components/organisms/profile/ai-settings-section";
import { ProfileSection } from "@/components/organisms/profile/profile-section";
import { Navbar } from "@/components/organisms/header/navbar";
import { DashboardTemplate } from "@/components/templates/dashboard/dashboard-template";
import { auth } from "@/lib/auth";
import { getDisplayProfile } from "@/lib/get-display-profile";
import { getUserProfile } from "@/services/profile-service";

export const metadata: Metadata = {
  title: "독스링고 - 개인정보 변경",
  description: "닉네임, 프로필 이미지, AI 도구 설정을 관리하세요.",
};

const ProfilePage = async (): Promise<ReactElement> => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const displayProfile = await getDisplayProfile(session);
  const profile = await getUserProfile(session.user.id);

  if (!profile) {
    redirect("/");
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
      <div className="flex w-full flex-col items-center gap-8">
        <ProfileSection profile={profile} />
        <AiSettingsSection />
      </div>
    </DashboardTemplate>
  );
};

export default ProfilePage;
