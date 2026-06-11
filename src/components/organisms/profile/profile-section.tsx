"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { ProfileAvatarUpload } from "@/components/molecules/profile/profile-avatar-upload";
import { useProfile } from "@/hooks/use-profile";
import { validateProfileImageClient } from "@/lib/validate-profile-image-client";
import type { UserProfile } from "@/types/user";

interface ProfileSectionProps {
  profile: UserProfile;
}

export const ProfileSection = ({
  profile,
}: ProfileSectionProps): ReactElement => {
  const {
    isSaving,
    isUploadingImage,
    isWithdrawing,
    errorMessage,
    successMessage,
    updateProfile,
    uploadProfileImage,
    withdrawAccount,
  } = useProfile();

  const [nickname, setNickname] = useState<string>(profile.nickname);
  const [savedImageUrl, setSavedImageUrl] = useState<string>(profile.image ?? "");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(
    profile.image ?? null,
  );
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imageSelectError, setImageSelectError] = useState<string | null>(null);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<boolean>(false);
  const previewObjectUrlRef = useRef<string | null>(null);

  const revokePreviewObjectUrl = (): void => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokePreviewObjectUrl();
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    void (async () => {
      setImageSelectError(null);

      let imageToSave = savedImageUrl.trim() || null;

      if (pendingImageFile) {
        const uploadedImageUrl = await uploadProfileImage(pendingImageFile);
        if (!uploadedImageUrl) {
          return;
        }

        imageToSave = uploadedImageUrl;
      }

      const isSaved = await updateProfile({
        nickname,
        image: imageToSave,
      });

      if (!isSaved || !pendingImageFile) {
        return;
      }

      revokePreviewObjectUrl();
      setPendingImageFile(null);
      setSavedImageUrl(imageToSave ?? "");
      setPreviewImageUrl(imageToSave);
    })();
  };

  const handleImageSelect = (file: File): void => {
    const validationMessage = validateProfileImageClient(file);

    if (validationMessage) {
      setImageSelectError(validationMessage);
      return;
    }

    setImageSelectError(null);

    revokePreviewObjectUrl();

    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setPendingImageFile(file);
    setPreviewImageUrl(objectUrl);
  };

  const handleWithdrawClick = (): void => {
    setShowWithdrawConfirm(true);
  };

  const handleWithdrawCancel = (): void => {
    setShowWithdrawConfirm(false);
  };

  const handleWithdrawConfirm = (): void => {
    void withdrawAccount();
  };

  const isBusy = isSaving || isUploadingImage || isWithdrawing;
  const hasPendingImage = pendingImageFile !== null;

  return (
    <section
      aria-label="개인정보 변경"
      className="flex w-full flex-col items-center gap-8"
    >
      <header className="flex flex-col gap-0.5 text-center">
        <h1 className="text-[2.375rem] font-extrabold tracking-tight text-white">
          개인정보 변경
        </h1>
        <p className="text-[1.375rem] text-indigo-200/70">
          닉네임과 프로필 이미지를 수정할 수 있습니다.
        </p>
      </header>

      <div className="relative w-full max-w-3xl -rotate-1 transition-transform duration-300 hover:rotate-0">
        <span
          aria-hidden="true"
          className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rotate-2 rounded-[2px] bg-violet-200/40 shadow-sm backdrop-blur-sm"
        />

        <form
          onSubmit={handleSubmit}
          className="rounded-sm border border-amber-200 bg-amber-50 p-6 shadow-[4px_8px_24px_rgba(0,0,0,0.45)]"
        >
          <div className="mb-6 flex flex-col items-center border-b border-dashed border-amber-300 pb-6">
            <ProfileAvatarUpload
              nickname={nickname}
              imageUrl={previewImageUrl}
              isUploading={isUploadingImage}
              disabled={isBusy}
              onImageSelect={handleImageSelect}
            />
          </div>

          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-amber-900">
                닉네임
              </span>
              <input
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="사용할 닉네임을 입력해주세요"
                required
                maxLength={20}
                disabled={isBusy}
                className="h-12 w-full rounded-md border border-dashed border-amber-400 bg-white/80 px-4 text-sm text-zinc-900 placeholder:text-amber-700/40 focus:border-solid focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-amber-100/50"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="mt-6 flex h-11 w-full items-center justify-center rounded-md bg-[#0a1030] text-sm font-semibold text-indigo-100 transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#141c4a] hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#0a1030]/40"
          >
            {isSaving || isUploadingImage ? "저장 중..." : "변경사항 저장"}
          </button>

          <p className="mt-3 text-center text-sm font-semibold text-amber-800">
            {isUploadingImage
              ? "이미지 저장 중..."
              : hasPendingImage
                ? "미리보기 중입니다. 변경사항 저장을 눌러 반영하세요."
                : "사진 아이콘을 눌러 이미지를 변경하세요."}
          </p>

          {successMessage && (
            <p
              role="status"
              className="mt-2 text-center text-sm font-semibold text-emerald-700"
            >
              {successMessage}
            </p>
          )}

          {(imageSelectError || errorMessage) && (
            <p
              role="alert"
              className="mt-2 text-center text-sm font-semibold text-red-600"
            >
              {imageSelectError ?? errorMessage}
            </p>
          )}
        </form>
      </div>

      <div className="relative w-full max-w-3xl rotate-[0.5deg]">
        <span
          aria-hidden="true"
          className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 -rotate-2 rounded-[2px] bg-red-200/40 shadow-sm backdrop-blur-sm"
        />

        <div className="rounded-sm border border-red-200 bg-red-50/90 p-6 text-center shadow-[4px_8px_24px_rgba(0,0,0,0.35)]">
          <h2 className="text-lg font-bold text-red-700">회원 탈퇴</h2>
          <p className="mt-2 text-sm font-bold leading-relaxed text-red-700">
            탈퇴 시 프로필, 북마크, 번역 히스토리가 모두 삭제되며 복구할 수
            없습니다.
          </p>

          {!showWithdrawConfirm ? (
            <button
              type="button"
              onClick={handleWithdrawClick}
              disabled={isBusy}
              className="mt-5 inline-flex h-11 w-fit items-center justify-center rounded-md bg-red-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
            >
              탈퇴 하기
            </button>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <p className="text-sm font-semibold text-red-700">
                정말 탈퇴하시겠습니까?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleWithdrawCancel}
                  disabled={isWithdrawing}
                  className="flex h-11 flex-1 items-center justify-center rounded-md border border-red-200 bg-white text-sm font-semibold text-zinc-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleWithdrawConfirm}
                  disabled={isWithdrawing}
                  className="flex h-11 flex-1 items-center justify-center rounded-md bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
                >
                  {isWithdrawing ? "탈퇴 중..." : "탈퇴하기"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
