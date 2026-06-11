import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth-config";

// 보호 경로 접근 시 세션이 없으면 authConfig.pages.signIn("/")으로 리다이렉트된다.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/main/:path*", "/bookmarks/:path*", "/profile/:path*"],
};
