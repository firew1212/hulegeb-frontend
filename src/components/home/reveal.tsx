"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Delay class names for staggered reveal animations.
 * Maps whole-millisecond delays to reusable CSS utilities (.reveal-delay-*).
 */
const DELAY_CLASS_NAMES: Record<number, string> = {
  100: "reveal-delay-100",
  200: "reveal-delay-200",
  300: "reveal-delay-300",
  400: "reveal-delay-400",
  500: "reveal-delay-500",
  600: "reveal-delay-600",
  700: "reveal-delay-700",
  800: "reveal-delay-800",
  900: "reveal-delay-900",
};

function getDelayClass(delay: number): string {
  if (delay <= 0) return "";
  return DELAY_CLASS_NAMES[delay] ?? "reveal-delay-500";
}

/**
 * Reveal foundation.
 *
 * Wraps a section or element so it fades and slides up as it enters the
 * viewport. The animation states are pure CSS (defined in app/globals.css as
 * .reveal and .reveal-visible) and reuse the existing transition/easing tokens;
 * this component wires the scroll detection and honors prefers-reduced-motion.
 *
 * Usage:
 *   <Reveal delay={200}>
 *     <div className="...">...</div>
 *   </Reveal>
 */
export function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [visible, setVisible] = useState<boolean>(() => reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -48px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [reducedMotion, setVisible, ref]);

  return (
    <div
      ref={ref}
      data-reveal
      className={`reveal ${
        visible ? "reveal-visible" : ""
      } ${getDelayClass(delay)}`}
    >
      {children}
    </div>
  );
}
