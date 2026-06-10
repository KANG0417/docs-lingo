"use client";

import type { ReactElement } from "react";
import { SnsLoginButton } from "@/components/molecules/button/sns-login-button";
import { SNS_PROVIDERS } from "@/constants/sns-providers";
import { signInWithSns } from "@/services/auth-service";
import type { SnsProviderId } from "@/types/auth";

export const LoginSection = (): ReactElement => {
  const handleSnsLogin = (provider: SnsProviderId): void => {
    void signInWithSns(provider);
  };

  return (
    <article className="flex w-full max-w-sm flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          로그인
        </h2>
        <p className="text-sm leading-relaxed text-zinc-500">
          SNS 계정으로 간편하게 시작하세요.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {SNS_PROVIDERS.map((provider) => (
          <li key={provider.id}>
            <SnsLoginButton provider={provider} onClick={handleSnsLogin} />
          </li>
        ))}
      </ul>
    </article>
  );
};
