"use client";

import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { ProfileAvatarUpload } from "@/components/molecules/profile/profile-avatar-upload";
import { useProfile } from "@/hooks/use-profile";
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
  const [imageUrl, setImageUrl] = useState<string>(profile.image ?? "");
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<boolean>(false);

  const previewImage = imageUrl.trim() || null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    void updateProfile({
      nickname,
      image: previewImage,
    });
  };

  const handleImageSelect = (file: File): void => {
    void (async () => {
      const uploadedImageUrl = await uploadProfileImage(file);
      if (uploadedImageUrl) {
        setImageUrl(uploadedImageUrl);
      }
    })();
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
              imageUrl={previewImage}
              isUploading={isUploadingImage}
              disabled={isSaving || isUploadingImage || isWithdrawing}
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
                disabled={isSaving || isUploadingImage || isWithdrawing}
                className="h-12 w-full rounded-md border border-dashed border-amber-400 bg-white/80 px-4 text-sm text-zinc-900 placeholder:text-amber-700/40 focus:border-solid focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-amber-100/50"
              />
            </label>

          </div>

          {successMessage && (
            <p
              role="status"
              className="mt-5 rounded-md border border-dashed border-emerald-400 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              {successMessage}
            </p>
          )}

          {errorMessage && (
            <p
              role="alert"
              className="mt-5 rounded-md border border-dashed border-red-400 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving || isUploadingImage || isWithdrawing}
            className="mt-6 flex h-11 w-full items-center justify-center rounded-md bg-[#0a1030] text-sm font-semibold text-indigo-100 transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#141c4a] hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#0a1030]/40"
          >
            {isSaving ? "저장 중..." : "변경사항 저장"}
          </button>
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
              disabled={isSaving || isUploadingImage || isWithdrawing}
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
