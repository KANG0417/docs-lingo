import { SupabaseAdapter } from "@auth/supabase-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import type { KakaoProfile } from "next-auth/providers/kakao";
import type { NaverProfile } from "next-auth/providers/naver";
import { authConfig } from "@/lib/auth/auth-config";
import { getSessionVersion, syncUserProfile } from "@/services/profile-service";

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
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID,
      clientSecret: process.env.AUTH_KAKAO_SECRET,
      authorization: {
        url: "https://kauth.kakao.com/oauth/authorize",
        params: {
          scope: "profile_nickname profile_image",
          prompt: "login",
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
        params: {
          auth_type: "reprompt",
        },
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
    jwt: async ({ token, user, trigger }) => {
      if (user?.id) {
        token.sub = user.id;
        token.sessionVersion = await getSessionVersion(user.id);
      }

      if (user?.name) {
        token.name = user.name;
      }

      if (user?.image) {
        token.picture = user.image;
      }

      if (!token.sub) {
        return token;
      }

      const currentVersion = await getSessionVersion(token.sub);
      const tokenVersion =
        typeof token.sessionVersion === "number" ? token.sessionVersion : -1;

      if (tokenVersion !== currentVersion) {
        return { ...token, exp: 0 };
      }

      const now = Math.floor(Date.now() / 1000);
      const isExpired =
        typeof token.exp === "number" && token.exp <= now;

      if (isExpired) {
        return { ...token, exp: 0 };
      }

      // updateAge: 0 이면 매 요청 update가 발생하므로, exp를 늘리지 않고 1일 고정 만료 유지
      if (trigger === "update") {
        return token;
      }

      return token;
    },
    session: ({ session, token }) => {
      const isExpired =
        typeof token.exp === "number" &&
        token.exp <= Math.floor(Date.now() / 1000);

      if (!token.sub || isExpired) {
        return session;
      }

      session.user.id = token.sub;

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
