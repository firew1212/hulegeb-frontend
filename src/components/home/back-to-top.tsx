"use client";

import { useEffect, useState } from "react";

import { useDictionary } from "@/i18n/provider";

export function BackToTop() {
  const dict = useDictionary();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const updateVisibility = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setVisible(window.scrollY > 560);
        frame = 0;
      });
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={dict.home.backToTop}
      title={dict.home.backToTop}
      data-visible={visible}
      onClick={() => {
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      }}
      className="back-to-top"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 3.25a.75.75 0 01.53.22l5.5 5.5a.75.75 0 11-1.06 1.06l-4.22-4.22v10.94a.75.75 0 01-1.5 0V5.81l-4.22 4.22a.75.75 0 11-1.06-1.06l5.5-5.5a.75.75 0 01.53-.22z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
