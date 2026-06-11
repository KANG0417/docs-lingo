"use client";

import clsx from "clsx";
import type { ReactElement } from "react";

interface BouncingTextProps {
  text: string;
  className?: string;
}

export const BouncingText = ({
  text,
  className,
}: BouncingTextProps): ReactElement => {
  return (
    <span className={clsx("inline-flex flex-wrap items-end", className)}>
      {[...text].map((char, index) => (
        <span
          key={`${char}-${index}`}
          aria-hidden="true"
          className="letter-bounce inline-block"
          style={{ animationDelay: `${index * 0.055}s` }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
};
