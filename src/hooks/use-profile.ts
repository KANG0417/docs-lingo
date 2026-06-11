"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UpdateUserProfilePayload, UserProfile } from "@/types/user";

interface ScheduleWithdrawalResult {
  scheduledAt: string;
}

interface UseProfileReturn {
  isSaving: boolean;
  isUploadingImage: boolean;
  isSchedulingWithdrawal: boolean;
  isCancellingWithdrawal: boolean;
  profileErrorMessage: string | null;
  profileSuccessMessage: string | null;
  withdrawalErrorMessage: string | null;
  withdrawalSuccessMessage: string | null;
  updateProfile: (payload: UpdateUserProfilePayload) => Promise<boolean>;
  uploadProfileImage: (file: File) => Promise<string | null>;
  scheduleWithdrawal: () => Promise<ScheduleWithdrawalResult | null>;
  cancelWithdrawal: () => Promise<boolean>;
}

export const useProfile = (): UseProfileReturn => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isSchedulingWithdrawal, setIsSchedulingWithdrawal] =
    useState<boolean>(false);
  const [isCancellingWithdrawal, setIsCancellingWithdrawal] =
    useState<boolean>(false);
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(
    null,
  );
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<
    string | null
  >(null);
  const [withdrawalErrorMessage, setWithdrawalErrorMessage] = useState<
    string | null
  >(null);
  const [withdrawalSuccessMessage, setWithdrawalSuccessMessage] = useState<
    string | null
  >(null);

  const updateProfile = async (
    payload: UpdateUserProfilePayload,
  ): Promise<boolean> => {
    setIsSaving(true);
    setProfileErrorMessage(null);
    setProfileSuccessMessage(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const { message } = (await response.json()) as { message: string };
        throw new Error(message);
      }

      const profile = (await response.json()) as UserProfile;
      setProfileSuccessMessage(`${profile.nickname}님의 프로필이 저장되었습니다.`);
      router.refresh();
      return true;
    } catch (error) {
      setProfileErrorMessage(
        error instanceof Error ? error.message : "프로필 저장에 실패했습니다.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const uploadProfileImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/profile/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const { message } = (await response.json()) as { message: string };
        throw new Error(message);
      }

      const { imageUrl } = (await response.json()) as { imageUrl: string };
      return imageUrl;
    } catch (error) {
      setProfileErrorMessage(
        error instanceof Error
          ? error.message
          : "프로필 이미지 업로드에 실패했습니다.",
      );
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const scheduleWithdrawal = async (): Promise<ScheduleWithdrawalResult | null> => {
    setIsSchedulingWithdrawal(true);
    setWithdrawalErrorMessage(null);
    setWithdrawalSuccessMessage(null);

    try {
      const response = await fetch("/api/profile/withdraw", {
        method: "POST",
      });

      if (!response.ok) {
        const { message } = (await response.json()) as { message: string };
        throw new Error(message);
      }

      const { scheduledAt } = (await response.json()) as ScheduleWithdrawalResult;
      router.refresh();
      return { scheduledAt };
    } catch (error) {
      setWithdrawalErrorMessage(
        error instanceof Error ? error.message : "탈퇴 예약에 실패했습니다.",
      );
      return null;
    } finally {
      setIsSchedulingWithdrawal(false);
    }
  };

  const cancelWithdrawal = async (): Promise<boolean> => {
    setIsCancellingWithdrawal(true);
    setWithdrawalErrorMessage(null);
    setWithdrawalSuccessMessage(null);

    try {
      const response = await fetch("/api/profile/withdraw", {
        method: "DELETE",
      });

      if (!response.ok) {
        const { message } = (await response.json()) as { message: string };
        throw new Error(message);
      }

      setWithdrawalSuccessMessage("탈퇴 예약이 취소되었습니다.");
      router.refresh();
      return true;
    } catch (error) {
      setWithdrawalErrorMessage(
        error instanceof Error ? error.message : "탈퇴 예약 취소에 실패했습니다.",
      );
      return false;
    } finally {
      setIsCancellingWithdrawal(false);
    }
  };

  return {
    isSaving,
    isUploadingImage,
    isSchedulingWithdrawal,
    isCancellingWithdrawal,
    profileErrorMessage,
    profileSuccessMessage,
    withdrawalErrorMessage,
    withdrawalSuccessMessage,
    updateProfile,
    uploadProfileImage,
    scheduleWithdrawal,
    cancelWithdrawal,
  };
};
