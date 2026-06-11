"use client";

import type { ReactElement } from "react";
import clsx from "clsx";
import { SnsIcon } from "@/components/atoms/icon/sns-icon";
import type { SnsProvider } from "@/types/auth";

interface SnsLoginButtonProps {
  provider: SnsProvider;
  onClick: (id: SnsProvider["id"]) => void;
}

export const SnsLoginButton = ({
  provider,
  onClick,
}: SnsLoginButtonProps): ReactElement => {
  const handleClick = (): void => {
    onClick(provider.id);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx(
        "font-doc-title flex h-12 w-full items-center justify-center gap-3 rounded-xl px-5",
        "text-sm font-semibold transition-all duration-150",
        "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
        provider.className,
      )}
    >
      <SnsIcon provider={provider.id} />
      {provider.label}
    </button>
  );
};
