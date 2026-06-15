import clsx from "clsx";
import type { ElementType, ReactElement, ReactNode } from "react";

interface TranslationSectionHeadingProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

export const TranslationSectionHeading = ({
  children,
  as: Tag = "h4",
  className,
}: TranslationSectionHeadingProps): ReactElement => {
  return (
    <Tag
      className={clsx(
        "translation-section-heading font-doc-translation-bold text-base font-bold text-zinc-900",
        className,
      )}
    >
      {children}
    </Tag>
  );
};
