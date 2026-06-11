"use client";

import { useState, type ReactElement } from "react";
import clsx from "clsx";
import type { DocumentCodeBlock } from "@/types/document-code-block";

interface PackageManagerCodeTabsProps {
  block: DocumentCodeBlock;
}

const DEFAULT_PACKAGE_MANAGER = "bun";

export const PackageManagerCodeTabs = ({
  block,
}: PackageManagerCodeTabsProps): ReactElement | null => {
  const visibleVariants = block.variants.filter((variant) => variant.code.trim());
  const tabVariants =
    visibleVariants.length > 0 ? visibleVariants : block.variants;
  const hasPackageTabs = tabVariants.every(
    (variant) => variant.packageManager.length > 0,
  );

  const preferredTab =
    tabVariants.find(
      (variant) => variant.packageManager === DEFAULT_PACKAGE_MANAGER,
    )?.packageManager ??
    tabVariants.find((variant) => variant.code.trim())?.packageManager ??
    tabVariants[0]?.packageManager ??
    "";

  const [activeTab, setActiveTab] = useState(preferredTab);

  const activeVariant =
    tabVariants.find((variant) => variant.packageManager === activeTab) ??
    tabVariants.find((variant) => variant.code.trim()) ??
    tabVariants[0];

  if (!activeVariant?.code.trim()) {
    return null;
  }

  return (
    <figure className="document-code-block my-4 overflow-hidden rounded-md border border-zinc-300 bg-zinc-50">
      {hasPackageTabs && (
        <div
          className="flex flex-wrap gap-2 border-b border-zinc-300 bg-zinc-100 px-3 py-2"
          role="tablist"
          aria-label="패키지 매니저 선택"
        >
          {tabVariants.map((variant) => (
            <button
              key={variant.packageManager}
              type="button"
              role="tab"
              aria-selected={activeTab === variant.packageManager}
              disabled={!variant.code.trim()}
              onClick={() => setActiveTab(variant.packageManager)}
              className={clsx(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                activeTab === variant.packageManager
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300",
                !variant.code.trim() && "opacity-40",
              )}
            >
              {variant.packageManager}
            </button>
          ))}
        </div>
      )}
      {block.label && (
        <div className="border-b border-zinc-300 bg-zinc-100 px-4 py-2 text-xs text-zinc-600">
          {block.label}
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-5 text-zinc-900">
        <code>{activeVariant.code}</code>
      </pre>
    </figure>
  );
};
