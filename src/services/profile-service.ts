import { WITHDRAWAL_GRACE_PERIOD_MS } from "@/constants/withdrawal";
import { getSupabaseAdminClient } from "@/lib/supabase/supabase-admin";
import {
  buildNicknameChangeCooldownMessage,
  resolveNicknameChangePolicy,
} from "@/lib/profile/nickname-change-policy";
import {
  resolveNicknameForProfile,
  validateNickname,
} from "@/lib/profile/validate-nickname";
import { deleteUserProfileImages } from "@/services/profile-image-service";
import type { UpdateUserProfilePayload, UserProfile } from "@/types/user";

interface ProfileRow {
  id: string;
  nickname: string;
  image: string | null;
  withdrawal_scheduled_at: string | null;
  session_version?: number;
}

interface ProfileHistoryRow {
  created_at: string;
}

interface SyncUserProfileParams {
  userId: string;
  nickname: string | null | undefined;
  image: string | null | undefined;
}

export const ensureUserProfileExists = async (
  userId: string,
  nickname = "사용자",
): Promise<void> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("[ensureUserProfileExists]", selectError.message);
    throw new Error("사용자 프로필을 확인하지 못했습니다.");
  }

  if (existingProfile) return;

  const { error: insertError } = await supabase.from("profiles").insert({
    id: userId,
    nickname,
  });

  if (insertError) {
    console.error("[ensureUserProfileExists]", insertError.message);
    throw new Error("사용자 프로필을 생성하지 못했습니다.");
  }
};

const mapProfileRow = (
  data: ProfileRow,
  nicknameNextChangeAt: string | null = null,
): UserProfile => ({
  id: data.id,
  nickname: data.nickname,
  image: data.image,
  withdrawalScheduledAt: data.withdrawal_scheduled_at,
  nicknameNextChangeAt,
});

const isWithdrawalDue = (scheduledAt: string): boolean =>
  new Date(scheduledAt).getTime() <= Date.now();

const fetchProfileRow = async (
  userId: string,
): Promise<ProfileRow | null> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, image, withdrawal_scheduled_at")
    .eq("id", userId)
    .maybeSingle();

  if (!error && data) {
    return data;
  }

  if (error) {
    const isMissingWithdrawalColumn = error.message.includes(
      "withdrawal_scheduled_at",
    );

    if (isMissingWithdrawalColumn) {
      console.warn(
        "[getUserProfile] withdrawal_scheduled_at 컬럼이 없습니다. supabase/schemas/02-profile.sql 마이그레이션을 실행하세요.",
      );
    } else {
      console.error("[getUserProfile]", error.message);
    }

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("profiles")
      .select("id, nickname, image")
      .eq("id", userId)
      .maybeSingle();

    if (fallbackError || !fallbackData) {
      return null;
    }

    return {
      ...fallbackData,
      withdrawal_scheduled_at: null,
    };
  }

  return null;
};

const getLastNicknameChangeAt = async (
  userId: string,
): Promise<string | null> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profile_histories")
    .select("created_at")
    .eq("user_id", userId)
    .eq("field", "nickname")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getLastNicknameChangeAt]", error.message);
    return null;
  }

  return (data as ProfileHistoryRow | null)?.created_at ?? null;
};

export const getNicknameChangePolicy = async (
  userId: string,
): Promise<{ nextChangeAt: string | null }> => {
  const lastChangedAt = await getLastNicknameChangeAt(userId);
  return resolveNicknameChangePolicy(lastChangedAt);
};

export const getSessionVersion = async (userId: string): Promise<number> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return 0;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("session_version")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getSessionVersion]", error.message);
    return 0;
  }

  return data?.session_version ?? 0;
};

export const incrementSessionVersion = async (userId: string): Promise<void> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const currentVersion = await getSessionVersion(userId);

  const { error } = await supabase
    .from("profiles")
    .update({ session_version: currentVersion + 1 })
    .eq("id", userId);

  if (error) {
    console.error("[incrementSessionVersion]", error.message);
  }
};

export const getUserProfile = async (
  userId: string,
): Promise<UserProfile | null> => {
  const data = await fetchProfileRow(userId);
  if (!data) {
    return null;
  }

  if (data.withdrawal_scheduled_at && isWithdrawalDue(data.withdrawal_scheduled_at)) {
    await deleteUserAccount(userId);
    return null;
  }

  const nicknameChangePolicy = await getNicknameChangePolicy(userId);

  return mapProfileRow(data, nicknameChangePolicy.nextChangeAt);
};

export const authUserExists = async (userId: string): Promise<boolean> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return true;
  }

  const { data, error } = await supabase
    .schema("next_auth")
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[authUserExists]", error.message);
    return true;
  }

  return Boolean(data);
};

export const getUserProfileOrEnsure = async (
  userId: string,
  fallbackNickname = "사용자",
): Promise<UserProfile | null> => {
  const profile = await getUserProfile(userId);
  if (profile) {
    return profile;
  }

  const exists = await authUserExists(userId);
  if (!exists) {
    return null;
  }

  await ensureUserProfileExists(userId, fallbackNickname);

  const ensuredProfile = await getUserProfile(userId);
  if (ensuredProfile) {
    return ensuredProfile;
  }

  return {
    id: userId,
    nickname: fallbackNickname,
    image: null,
    withdrawalScheduledAt: null,
    nicknameNextChangeAt: null,
  };
};

export const syncUserProfile = async ({
  userId,
  nickname,
  image,
}: SyncUserProfileParams): Promise<void> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const resolvedNickname = resolveNicknameForProfile(nickname);

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", userId)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from("profiles").insert({
      id: userId,
      nickname: resolvedNickname,
      image: image ?? null,
    });
    return;
  }

  if (
    existingProfile.nickname === "사용자" ||
    existingProfile.nickname !== resolvedNickname
  ) {
    await supabase
      .from("profiles")
      .update({
        nickname: resolvedNickname,
        ...(image ? { image } : {}),
      })
      .eq("id", userId);
  }
};

export const updateUserProfile = async (
  userId: string,
  payload: UpdateUserProfilePayload,
): Promise<UserProfile> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const trimmedNickname = payload.nickname.trim();
  const nicknameError = validateNickname(trimmedNickname);

  if (nicknameError) {
    throw new Error(nicknameError);
  }

  const currentProfile = await fetchProfileRow(userId);

  if (!currentProfile) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  const isNicknameChanging = trimmedNickname !== currentProfile.nickname;

  if (isNicknameChanging) {
    const nicknameChangePolicy = await getNicknameChangePolicy(userId);

    if (nicknameChangePolicy.nextChangeAt) {
      throw new Error(
        buildNicknameChangeCooldownMessage(nicknameChangePolicy.nextChangeAt),
      );
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      nickname: trimmedNickname,
      image: payload.image,
    })
    .eq("id", userId)
    .select("id, nickname, image, withdrawal_scheduled_at")
    .single();

  if (error || !data) {
    throw new Error("프로필 업데이트에 실패했습니다.");
  }

  await supabase
    .schema("next_auth")
    .from("users")
    .update({
      name: trimmedNickname,
      image: payload.image,
    })
    .eq("id", userId);

  const nicknameChangePolicy = await getNicknameChangePolicy(userId);

  return mapProfileRow(data, nicknameChangePolicy.nextChangeAt);
};

export const scheduleAccountWithdrawal = async (
  userId: string,
): Promise<string> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const scheduledAt = new Date(Date.now() + WITHDRAWAL_GRACE_PERIOD_MS).toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .update({ withdrawal_scheduled_at: scheduledAt })
    .eq("id", userId)
    .select("withdrawal_scheduled_at")
    .single();

  if (error || !data?.withdrawal_scheduled_at) {
    throw new Error("탈퇴 예약에 실패했습니다.");
  }

  return data.withdrawal_scheduled_at;
};

export const cancelAccountWithdrawal = async (userId: string): Promise<void> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data: profile, error: selectError } = await supabase
    .from("profiles")
    .select("withdrawal_scheduled_at")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    throw new Error("탈퇴 예약 상태를 확인하지 못했습니다.");
  }

  if (!profile?.withdrawal_scheduled_at) {
    throw new Error("진행 중인 탈퇴 예약이 없습니다.");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ withdrawal_scheduled_at: null })
    .eq("id", userId);

  if (updateError) {
    throw new Error("탈퇴 예약 취소에 실패했습니다.");
  }
};

export const deleteUserAccount = async (userId: string): Promise<void> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  await deleteUserProfileImages(userId);

  const { error } = await supabase
    .schema("next_auth")
    .from("users")
    .delete()
    .eq("id", userId);

  if (error) {
    throw new Error("회원 탈퇴에 실패했습니다.");
  }
};
