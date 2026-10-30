"use client";

import { useRef, useState, useEffect, useCallback } from "react";

import { cn } from "@/lib/utils";

type ProductRailProps = {
  children: React.ReactNode;
  label?: string;
  className?: string;
};

export function ProductRail({ children, label, className }: ProductRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const scrollByAmount = (direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  };

  return (
    <div className={cn("relative", className)}>
      {label ? (
        <h3 className="sr-only">{label}</h3>
      ) : null}
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label={label ?? "Product rail"}
        tabIndex={0}
      >
        {children}
      </div>
      <div className="mt-4 hidden items-center justify-end gap-2 md:flex">
        <button
          type="button"
          onClick={() => scrollByAmount("left")}
          disabled={!canScrollLeft}
          aria-label="Scroll products left"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => scrollByAmount("right")}
          disabled={!canScrollRight}
          aria-label="Scroll products right"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          →
        </button>
      </div>
    </div>
  );
}