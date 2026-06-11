"use client";

import { useEffect, useState } from "react";

interface UseWindowScrollOptions {
  threshold: number;
}

interface UseWindowScrollReturn {
  scrollY: number;
  isPastThreshold: boolean;
}

export const useWindowScroll = ({
  threshold,
}: UseWindowScrollOptions): UseWindowScrollReturn => {
  const [scrollY, setScrollY] = useState<number>(0);

  useEffect(() => {
    const handleScroll = (): void => {
      setScrollY(window.scrollY);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return {
    scrollY,
    isPastThreshold: scrollY > threshold,
  };
};
