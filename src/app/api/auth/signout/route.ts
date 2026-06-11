import { auth, signOut } from "@/lib/auth/auth";
import { revokeOAuthGrantsForUser } from "@/services/oauth-revoke-service";
import { incrementSessionVersion } from "@/services/profile-service";

export const GET = async (): Promise<Response> => {
  const session = await auth();

  if (session?.user?.id) {
    await revokeOAuthGrantsForUser(session.user.id);
    await incrementSessionVersion(session.user.id);
  }

  return signOut({ redirectTo: "/" });
};
