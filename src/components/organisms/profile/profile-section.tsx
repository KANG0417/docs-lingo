"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import clsx from "clsx";
import { NicknameRuleList } from "@/components/molecules/profile/nickname-rule-list";
import { ProfileAvatarUpload } from "@/components/molecules/profile/profile-avatar-upload";
import { WithdrawConfirmModal } from "@/components/molecules/profile/withdraw-confirm-modal";
import { useProfile } from "@/hooks/use-profile";
import {
  buildNicknameChangeCooldownMessage,
  formatNicknameNextChangeAt,
  isNicknameChangeLocked,
} from "@/lib/profile/nickname-change-policy";
import {
  computeWithdrawalScheduledAtIso,
  formatWithdrawalScheduledAt,
} from "@/lib/profile/format-withdrawal-scheduled-at";
import { NICKNAME_MAX_LENGTH } from "@/constants/nickname";
import {
  enforceNicknameMaxLength,
  getNicknameLength,
  validateNickname,
} from "@/lib/profile/validate-nickname";
import { validateProfileImageClient } from "@/lib/profile/validate-profile-image-client";
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
    isSchedulingWithdrawal,
    isCancellingWithdrawal,
    profileErrorMessage,
    profileSuccessMessage,
    withdrawalErrorMessage,
    withdrawalSuccessMessage,
    clearProfileFeedback,
    updateProfile,
    uploadProfileImage,
    scheduleWithdrawal,
    cancelWithdrawal,
  } = useProfile();

  const [nickname, setNickname] = useState<string>(() =>
    enforceNicknameMaxLength(profile.nickname),
  );
  const [savedImageUrl, setSavedImageUrl] = useState<string>(profile.image ?? "");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(
    profile.image ?? null,
  );
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imageSelectError, setImageSelectError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [scheduledWithdrawalAt, setScheduledWithdrawalAt] = useState<string | null>(
    profile.withdrawalScheduledAt,
  );
  const [nicknameNextChangeAt, setNicknameNextChangeAt] = useState<string | null>(
    profile.nicknameNextChangeAt,
  );
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [withdrawScheduledAtPreview, setWithdrawScheduledAtPreview] = useState<string>(
    computeWithdrawalScheduledAtIso(),
  );
  const previewObjectUrlRef = useRef<string | null>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setScheduledWithdrawalAt(profile.withdrawalScheduledAt);
  }, [profile.withdrawalScheduledAt]);

  useEffect(() => {
    setNickname(profile.nickname);
    setNicknameNextChangeAt(profile.nicknameNextChangeAt);
  }, [profile.nickname, profile.nicknameNextChangeAt]);

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

  const nicknameLength = getNicknameLength(nickname);
  const isNicknameLocked = isNicknameChangeLocked(nicknameNextChangeAt);

  const applyNicknameValue = (value: string): void => {
    if (isNicknameLocked) {
      return;
    }

    setNickname(enforceNicknameMaxLength(value));
    setInfoMessage(null);
    setNicknameError(null);
    clearProfileFeedback();
  };

  const showNicknameError = (message: string): void => {
    setNicknameError(message);
    nicknameInputRef.current?.focus({ preventScroll: false });
  };

  const hasProfileChanges = (): boolean => {
    const hasNicknameChange = nickname.trim() !== profile.nickname;
    const hasImageChange = pendingImageFile !== null;

    return hasNicknameChange || hasImageChange;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    void (async () => {
      setImageSelectError(null);
      setNicknameError(null);
      setInfoMessage(null);
      clearProfileFeedback();

      const nicknameValidationMessage = validateNickname(nickname);
      if (nicknameValidationMessage) {
        showNicknameError(nicknameValidationMessage);
        return;
      }

      const hasNicknameChange = nickname.trim() !== profile.nickname;

      if (
        hasNicknameChange &&
        nicknameNextChangeAt &&
        isNicknameChangeLocked(nicknameNextChangeAt)
      ) {
        showNicknameError(buildNicknameChangeCooldownMessage(nicknameNextChangeAt));
        return;
      }

      if (!hasProfileChanges()) {
        setInfoMessage("변경된 게 없습니다.");
        return;
      }

      let imageToSave = savedImageUrl.trim() || null;

      if (pendingImageFile) {
        const uploadedImageUrl = await uploadProfileImage(pendingImageFile);
        if (!uploadedImageUrl) {
          return;
        }

        imageToSave = uploadedImageUrl;
      }

      const isSaved = await updateProfile({
        nickname: nickname.trim(),
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
    setInfoMessage(null);
    clearProfileFeedback();

    revokePreviewObjectUrl();

    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setPendingImageFile(file);
    setPreviewImageUrl(objectUrl);
  };

  const handleWithdrawClick = (): void => {
    setWithdrawScheduledAtPreview(computeWithdrawalScheduledAtIso());
    setIsWithdrawModalOpen(true);
  };

  const handleWithdrawModalClose = (): void => {
    setIsWithdrawModalOpen(false);
  };

  const handleWithdrawConfirm = (): void => {
    void (async () => {
      const result = await scheduleWithdrawal();
      if (!result) {
        return;
      }

      setScheduledWithdrawalAt(result.scheduledAt);
      setIsWithdrawModalOpen(false);
    })();
  };

  const handleCancelWithdrawal = (): void => {
    void (async () => {
      const isCancelled = await cancelWithdrawal();
      if (!isCancelled) {
        return;
      }

      setScheduledWithdrawalAt(null);
    })();
  };

  const isBusy =
    isSaving ||
    isUploadingImage ||
    isSchedulingWithdrawal ||
    isCancellingWithdrawal;
  const hasPendingImage = pendingImageFile !== null;
  const hasScheduledWithdrawal = scheduledWithdrawalAt !== null;

  return (
    <section
      aria-label="개인정보 변경"
      className="flex w-full flex-col items-center gap-8"
    >
      <header className="flex flex-col gap-0.5 text-center">
        <h1 className="font-doc-title text-[2.375rem] font-extrabold tracking-tight text-white">
          개인정보 변경
        </h1>
        <p className="font-doc-aux text-[1.375rem] text-indigo-200/70">
          닉네임과 프로필 이미지를 수정할 수 있습니다.
        </p>
      </header>

      <div className="relative w-full max-w-3xl -rotate-1 transition-transform duration-300 hover:rotate-0">
        <span
          aria-hidden="true"
          className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rotate-2 rounded-[2px] bg-violet-200/40 shadow-sm backdrop-blur-sm"
        />

        <form
          noValidate
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
            <label className="font-doc-nickname flex flex-col gap-2">
              <span className="text-sm font-semibold text-amber-900">닉네임</span>
              <div className="memo-lines rounded-md bg-white/70 px-3 py-2.5">
                <NicknameRuleList />
              </div>
              <input
                ref={nicknameInputRef}
                id="profile-nickname"
                type="text"
                value={nickname}
                onChange={(event) => applyNicknameValue(event.target.value)}
                onCompositionEnd={(event) =>
                  applyNicknameValue(event.currentTarget.value)
                }
                placeholder="사용할 닉네임을 입력해주세요"
                disabled={isBusy || isNicknameLocked}
                aria-disabled={isBusy || isNicknameLocked}
                aria-invalid={nicknameError ? true : undefined}
                aria-describedby={
                  nicknameError ? "profile-nickname-error" : undefined
                }
                className={clsx(
                  "h-12 w-full rounded-md border bg-white/80 px-4 text-lg text-zinc-900 placeholder:text-sm placeholder:text-amber-700/40 focus:outline-none disabled:cursor-not-allowed disabled:bg-amber-100/50",
                  nicknameError
                    ? "border-solid border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    : "border-dashed border-amber-400 focus:border-solid focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200",
                )}
              />
              {nicknameError ? (
                <p
                  id="profile-nickname-error"
                  role="alert"
                  className="font-doc-nickname-meta whitespace-pre-line text-sm font-semibold leading-relaxed text-red-600"
                >
                  {nicknameError}
                </p>
              ) : null}
              {isNicknameLocked && nicknameNextChangeAt ? (
                <p
                  role="status"
                  className="font-doc-nickname-meta text-sm font-semibold leading-relaxed text-amber-800"
                >
                  닉네임 변경 제한 중입니다.{" "}
                  <time dateTime={nicknameNextChangeAt}>
                    {formatNicknameNextChangeAt(nicknameNextChangeAt)}
                  </time>
                  {" "}이후에 다시 변경할 수 있습니다.
                </p>
              ) : null}
              <p
                role="status"
                aria-live="polite"
                className="font-doc-nickname-meta text-right text-sm font-semibold text-[#0a1030]"
              >
                <span className="text-[#141c4a]">{nicknameLength}</span>
                <span className="text-[#141c4a]/60"> / {NICKNAME_MAX_LENGTH}</span>
              </p>
            </label>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="submit"
              disabled={isBusy}
              className="profile-save-btn flex h-11 w-fit items-center justify-center rounded-full px-8 text-sm font-semibold text-indigo-100"
            >
              <span className="relative z-10">
                {isSaving || isUploadingImage ? "저장 중..." : "변경사항 저장"}
              </span>
            </button>
          </div>

          <p className="font-doc-aux mt-3 text-center text-sm font-semibold text-amber-800">
            {isUploadingImage
              ? "이미지 저장 중..."
              : hasPendingImage
                ? "미리보기 중입니다. 변경사항 저장을 눌러 반영하세요."
                : "사진 아이콘을 눌러 이미지를 변경하세요."}
          </p>

          {infoMessage ? (
            <p
              role="status"
              className="font-doc-aux mt-2 text-center text-sm font-semibold text-amber-700"
            >
              {infoMessage}
            </p>
          ) : (
            profileSuccessMessage && (
              <p
                role="status"
                className="font-doc-aux mt-2 text-center text-sm font-semibold text-emerald-700"
              >
                {profileSuccessMessage}
              </p>
            )
          )}

          {(imageSelectError || profileErrorMessage) && (
            <p
              role="alert"
              className="font-doc-aux mt-2 text-center text-sm font-semibold text-red-600"
            >
              {imageSelectError ?? profileErrorMessage}
            </p>
          )}
        </form>
      </div>

      <div className="relative w-full max-w-3xl rotate-[0.5deg]">
        <span
          aria-hidden="true"
          className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 -rotate-2 rounded-[2px] bg-red-200/40 shadow-sm backdrop-blur-sm"
        />

        <div className="font-doc-withdrawal rounded-sm border border-red-200 bg-red-50/90 p-6 text-center shadow-[4px_8px_24px_rgba(0,0,0,0.35)]">
          <h2 className="text-base font-bold text-red-700">회원 탈퇴</h2>

          {withdrawalSuccessMessage && (
            <p
              role="status"
              className="mt-3 text-sm font-semibold text-emerald-700"
            >
              {withdrawalSuccessMessage}
            </p>
          )}

          {withdrawalErrorMessage && (
            <p
              role="alert"
              className="mt-3 text-sm font-semibold text-red-600"
            >
              {withdrawalErrorMessage}
            </p>
          )}

          <p className="mt-2 text-sm font-bold leading-relaxed text-red-700">
            탈퇴 시 프로필, 북마크, 번역 히스토리가 모두 삭제되며 복구할 수
            없습니다.
          </p>

          {hasScheduledWithdrawal ? (
            <div className="mt-5 flex flex-col items-center gap-4">
              <p className="text-sm font-semibold leading-relaxed text-red-700">
                탈퇴가 예약되었습니다. 24시간 이내 취소하지 않으면 아래 시각에
                탈퇴가 완료됩니다.
              </p>
              <p className="w-full rounded-md border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-800">
                탈퇴 예정 시각
                <br />
                <time dateTime={scheduledWithdrawalAt} className="mt-1 block text-base">
                  {formatWithdrawalScheduledAt(scheduledWithdrawalAt)}
                </time>
              </p>
              <button
                type="button"
                onClick={handleCancelWithdrawal}
                disabled={isBusy}
                className="inline-flex h-11 w-fit items-center justify-center rounded-md border border-red-200 bg-white px-6 text-sm font-semibold text-zinc-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                {isCancellingWithdrawal ? "취소 중..." : "탈퇴 취소"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleWithdrawClick}
              disabled={isBusy}
              className="profile-withdraw-btn mt-5 inline-flex h-11 w-fit items-center justify-center rounded-full px-6 text-sm font-semibold text-white"
            >
              <span className="relative z-10">탈퇴 하기</span>
            </button>
          )}
        </div>
      </div>

      <WithdrawConfirmModal
        isOpen={isWithdrawModalOpen}
        scheduledAtPreview={withdrawScheduledAtPreview}
        isSubmitting={isSchedulingWithdrawal}
        onClose={handleWithdrawModalClose}
        onConfirm={handleWithdrawConfirm}
      />
    </section>
  );
};
