import { getSupabaseAdminClient } from "@/lib/supabase/supabase-admin";
import type { SnsProviderId } from "@/types/auth";

interface OAuthAccountRow {
  provider: string;
  access_token: string | null;
}

const GITHUB_GRANT_REVOKE_URL = (clientId: string): string =>
  `https://api.github.com/applications/${clientId}/grant`;

const getUserOAuthAccounts = async (
  userId: string,
): Promise<OAuthAccountRow[]> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .schema("next_auth")
    .from("accounts")
    .select("provider, access_token")
    .eq("userId", userId);

  if (error) {
    console.error("[getUserOAuthAccounts]", error.message);
    return [];
  }

  return data ?? [];
};

const revokeGitHubGrant = async (accessToken: string): Promise<void> => {
  const clientId = process.env.AUTH_GITHUB_ID;
  const clientSecret = process.env.AUTH_GITHUB_SECRET;

  if (!clientId || !clientSecret || !accessToken) {
    return;
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(GITHUB_GRANT_REVOKE_URL(clientId), {
    method: "DELETE",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ access_token: accessToken }),
  });

  if (!response.ok && response.status !== 404) {
    console.error("[revokeGitHubGrant]", response.status, await response.text());
  }
};

const revokeProviderGrant = async (
  provider: SnsProviderId,
  accessToken: string | null,
): Promise<void> => {
  if (!accessToken) {
    return;
  }

  if (provider === "github") {
    await revokeGitHubGrant(accessToken);
  }
};

export const revokeOAuthGrantsForUser = async (userId: string): Promise<void> => {
  const accounts = await getUserOAuthAccounts(userId);

  await Promise.all(
    accounts.map((account) =>
      revokeProviderGrant(account.provider as SnsProviderId, account.access_token),
    ),
  );
};
