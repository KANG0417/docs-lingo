import { SupabaseAdapter } from "@auth/supabase-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import type { KakaoProfile } from "next-auth/providers/kakao";
import type { NaverProfile } from "next-auth/providers/naver";
import { authConfig } from "@/lib/auth-config";
import { syncUserProfile } from "@/services/profile-service";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase 키가 설정된 경우에만 어댑터를 연결한다. (미설정 시 JWT 전용으로 동작)
const adapter =
  supabaseUrl && supabaseServiceRoleKey
    ? SupabaseAdapter({ url: supabaseUrl, secret: supabaseServiceRoleKey })
    : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID,
      clientSecret: process.env.AUTH_KAKAO_SECRET,
      authorization: {
        url: "https://kauth.kakao.com/oauth/authorize",
        params: {
          scope: "profile_nickname profile_image",
        },
      },
      profile: (profile: KakaoProfile) => ({
        id: profile.id.toString(),
        name:
          profile.kakao_account?.profile?.nickname ??
          profile.properties?.nickname,
        email: profile.kakao_account?.email,
        image:
          profile.kakao_account?.profile?.profile_image_url ??
          profile.properties?.profile_image,
      }),
    }),
    Naver({
      clientId: process.env.AUTH_NAVER_ID,
      clientSecret: process.env.AUTH_NAVER_SECRET,
      authorization: {
        url: "https://nid.naver.com/oauth2.0/authorize",
      },
      profile: (profile: NaverProfile) => ({
        id: profile.response.id,
        name: profile.response.nickname ?? profile.response.name,
        email: profile.response.email,
        image: profile.response.profile_image,
      }),
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt: ({ token, user }) => {
      if (user?.name) {
        token.name = user.name;
      }
      if (user?.image) {
        token.picture = user.image;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.name) {
        session.user.name = token.name;
      }
      if (token.picture) {
        session.user.image = token.picture;
      }
      return session;
    },
  },
  events: {
    signIn: async ({ user }) => {
      if (!user.id) return;

      await syncUserProfile({
        userId: user.id,
        nickname: user.name ?? "사용자",
        image: user.image,
      });
    },
  },
});
