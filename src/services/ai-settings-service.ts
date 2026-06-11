import { getSupabaseAdminClient } from "@/lib/supabase/supabase-admin";
import type { UserAiCredentials } from "@/types/ai-settings";

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
