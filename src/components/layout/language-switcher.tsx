"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  getLocalizedPathname,
  locales,
  type Locale,
} from "@/i18n/config";
import { useDictionary, useLocale } from "@/i18n/provider";
import { getSafeReturnTo } from "@/lib/dashboard";

interface LanguageSwitcherProps {
  size?: "sm" | "default";
  className?: string;
}

export function LanguageSwitcher({
  size = "default",
  className = "",
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const dict = useDictionary();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pointerType = useRef("");

  function onChange(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    const newPath = getLocalizedPathname(pathname, next);
    const params = new URLSearchParams(searchParams.toString());
    const returnTo = params.get("returnTo");
    if (returnTo) {
      const safeReturnTo = getSafeReturnTo(returnTo, locale);
      if (safeReturnTo) {
        const target = new URL(safeReturnTo, window.location.origin);
        const localizedTarget = getLocalizedPathname(target.pathname, next);
        params.set(
          "returnTo",
          `${localizedTarget}${target.search}${target.hash}`,
        );
      } else {
        params.delete("returnTo");
      }
    }
    const query = params.toString();
    router.push(query ? `${newPath}?${query}` : newPath);
  }

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={menuRef}
      className={`relative ${className}`}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={dict.language.label}
        aria-expanded={open}
        aria-controls="header-language-menu"
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
        }}
        onClick={(event) => {
          setOpen((current) =>
            event.detail === 0 || pointerType.current !== "mouse"
              ? !current
              : true,
          );
        }}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border/80 bg-surface px-3 text-sm font-medium text-foreground shadow-flat transition-colors hover:border-brand/30 hover:bg-accent-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
          size === "sm" ? "min-w-[7rem] px-2.5 text-xs" : "min-w-[8rem]"
        }`}
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="7" />
          <path d="M3 10h14M10 3c1.8 1.9 2.5 4.2 2.5 7s-.7 5.1-2.5 7c-1.8-1.9-2.5-4.2-2.5-7S8.2 4.9 10 3Z" />
        </svg>
        <span>{locale === "en" ? dict.language.english : dict.language.amharic}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 7.47a.75.75 0 011.06.02L10 11.168l3.72-3.678a.75.75 0 111.05 1.07l-4.25 4.2a.75.75 0 01-1.05 0l-4.25-4.2a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div
          id="header-language-menu"
          role="group"
          aria-label={dict.language.label}
          className={`absolute right-0 z-50 w-48 rounded-2xl border border-border bg-surface p-2 shadow-floating animate-scale-in motion-reduce:animate-none ${
            size === "sm"
              ? "top-full origin-top-right"
              : "bottom-full top-auto mb-2 origin-bottom-right"
          }`}
        >
          {locales.map((next) => {
            const selected = next === locale;
            const label =
              next === "en" ? dict.language.english : dict.language.amharic;
            return (
              <button
                key={next}
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onChange(next)}
                className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm transition-colors hover:bg-accent-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                  selected ? "bg-accent-soft font-semibold text-brand" : "text-foreground"
                }`}
              >
                <span>{label}</span>
                {selected ? (
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.29a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25A1 1 0 016.204 9.29l2.543 2.543 6.543-6.543a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
