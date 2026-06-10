import { AUTO_AI_MODEL, DEFAULT_AI_PROVIDER } from "@/constants/ai-providers";
import { isValidGeminiApiKeyFormat } from "@/lib/gemini-api-key";
import { maskApiKey } from "@/lib/mask-api-key";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type {
  UpdateUserAiSettingsPayload,
  UserAiCredentials,
  UserAiSettings,
} from "@/types/ai-settings";

interface AiSettingsRow {
  user_id: string;
  provider: string;
  api_key: string | null;
  model: string | null;
}

const mapUserAiSettings = (row: AiSettingsRow | null): UserAiSettings => {
  if (!row) {
    return {
      provider: DEFAULT_AI_PROVIDER,
      model: AUTO_AI_MODEL,
      hasApiKey: false,
      maskedApiKey: null,
    };
  }

  const apiKey = row.api_key?.trim() ?? "";

  return {
    provider: row.provider as UserAiSettings["provider"],
    model: AUTO_AI_MODEL,
    hasApiKey: Boolean(apiKey),
    maskedApiKey: apiKey ? maskApiKey(apiKey) : null,
  };
};

export const getUserAiSettings = async (
  userId: string,
): Promise<UserAiSettings> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data, error } = await supabase
    .from("user_ai_settings")
    .select("user_id, provider, api_key, model")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("AI 설정을 불러오지 못했습니다.");
  }

  return mapUserAiSettings((data as AiSettingsRow | null) ?? null);
};

export const getUserAiCredentials = async (
  userId: string,
): Promise<UserAiCredentials | null> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_ai_settings")
    .select("provider, api_key")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.api_key?.trim()) {
    return null;
  }

  return {
    provider: data.provider as UserAiCredentials["provider"],
    apiKey: data.api_key.trim(),
  };
};

export const updateUserAiSettings = async (
  userId: string,
  payload: UpdateUserAiSettingsPayload,
): Promise<UserAiSettings> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data: existingSettings } = await supabase
    .from("user_ai_settings")
    .select("api_key")
    .eq("user_id", userId)
    .maybeSingle();

  const trimmedApiKey = payload.apiKey?.trim() ?? "";
  const shouldClearApiKey = Boolean(payload.clearApiKey);
  const nextApiKey = shouldClearApiKey
    ? null
    : trimmedApiKey || existingSettings?.api_key || null;

  if (!shouldClearApiKey && !nextApiKey) {
    throw new Error("AI API 키를 입력해주세요.");
  }

  if (nextApiKey && !isValidGeminiApiKeyFormat(nextApiKey)) {
    throw new Error(
      "Google AI Studio에서 발급한 'AIza' 또는 'AQ.'로 시작하는 Gemini API 키를 입력해 주세요.",
    );
  }

  const { data, error } = await supabase
    .from("user_ai_settings")
    .upsert(
      {
        user_id: userId,
        provider: payload.provider,
        model: AUTO_AI_MODEL,
        api_key: nextApiKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("user_id, provider, api_key, model")
    .single();

  if (error || !data) {
    throw new Error("AI 설정 저장에 실패했습니다.");
  }

  return mapUserAiSettings(data as AiSettingsRow);
};

export const deleteUserAiSettings = async (userId: string): Promise<void> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  await supabase.from("user_ai_settings").delete().eq("user_id", userId);
};
