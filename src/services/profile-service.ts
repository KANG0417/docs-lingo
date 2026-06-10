import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { deleteUserProfileImages } from "@/services/profile-image-service";
import type { UpdateUserProfilePayload, UserProfile } from "@/types/user";

interface SyncUserProfileParams {
  userId: string;
  nickname: string | null | undefined;
  image: string | null | undefined;
}

export const getUserProfile = async (
  userId: string,
): Promise<UserProfile | null> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, image")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    nickname: data.nickname,
    image: data.image,
  };
};

export const syncUserProfile = async ({
  userId,
  nickname,
  image,
}: SyncUserProfileParams): Promise<void> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase || !nickname) return;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", userId)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from("profiles").insert({
      id: userId,
      nickname,
      image: image ?? null,
    });
    return;
  }

  if (existingProfile.nickname === "사용자" || existingProfile.nickname !== nickname) {
    await supabase
      .from("profiles")
      .update({
        nickname,
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
  if (!trimmedNickname) {
    throw new Error("닉네임을 입력해주세요.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      nickname: trimmedNickname,
      image: payload.image,
    })
    .eq("id", userId)
    .select("id, nickname, image")
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

  return {
    id: data.id,
    nickname: data.nickname,
    image: data.image,
  };
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
