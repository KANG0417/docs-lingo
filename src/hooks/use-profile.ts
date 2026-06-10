"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOutFromSns } from "@/services/auth-service";
import type { UpdateUserProfilePayload, UserProfile } from "@/types/user";

interface UseProfileReturn {
  isSaving: boolean;
  isUploadingImage: boolean;
  isWithdrawing: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  updateProfile: (payload: UpdateUserProfilePayload) => Promise<void>;
  uploadProfileImage: (file: File) => Promise<string | null>;
  withdrawAccount: () => Promise<void>;
}

export const useProfile = (): UseProfileReturn => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateProfile = async (
    payload: UpdateUserProfilePayload,
  ): Promise<void> => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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
      setSuccessMessage(`${profile.nickname}님의 프로필이 저장되었습니다.`);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "프로필 저장에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const uploadProfileImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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

      const { imageUrl, profile } = (await response.json()) as {
        imageUrl: string;
        profile: UserProfile;
      };
      setSuccessMessage(`${profile.nickname}님의 프로필 이미지가 저장되었습니다.`);
      router.refresh();
      return imageUrl;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "프로필 이미지 업로드에 실패했습니다.",
      );
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const withdrawAccount = async (): Promise<void> => {
    setIsWithdrawing(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/profile/withdraw", {
        method: "DELETE",
      });

      if (!response.ok) {
        const { message } = (await response.json()) as { message: string };
        throw new Error(message);
      }

      await signOutFromSns();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "회원 탈퇴에 실패했습니다.",
      );
      setIsWithdrawing(false);
    }
  };

  return {
    isSaving,
    isUploadingImage,
    isWithdrawing,
    errorMessage,
    successMessage,
    updateProfile,
    uploadProfileImage,
    withdrawAccount,
  };
};
