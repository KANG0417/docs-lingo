"use client";

import { useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { UserAvatar } from "@/components/atoms/avatar/user-avatar";
import { CameraIcon } from "@/components/atoms/icon/camera-icon";
import { PROFILE_IMAGE_ALLOWED_MIME_TYPES } from "@/constants/profile-storage";

interface ProfileAvatarUploadProps {
  nickname: string;
  imageUrl: string | null;
  isUploading: boolean;
  disabled?: boolean;
  onImageSelect: (file: File) => void;
}

export const ProfileAvatarUpload = ({
  nickname,
  imageUrl,
  isUploading,
  disabled = false,
  onImageSelect,
}: ProfileAvatarUploadProps): ReactElement => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraClick = (): void => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    onImageSelect(file);
    event.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <UserAvatar nickname={nickname} image={imageUrl} size="lg" />

        <button
          type="button"
          onClick={handleCameraClick}
          disabled={disabled || isUploading}
          aria-label="프로필 이미지 변경"
          className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-50 bg-[#0a1030] text-indigo-100 shadow-md transition-transform hover:scale-105 disabled:opacity-50"
        >
          <CameraIcon size={18} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={PROFILE_IMAGE_ALLOWED_MIME_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </div>
  );
};
