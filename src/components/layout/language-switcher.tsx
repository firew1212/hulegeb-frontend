"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getLocalizedPathname, locales, type Locale } from "@/i18n/config";
import { useDictionary, useLocale } from "@/i18n/provider";

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

  function onChange(next: Locale) {
    if (next === locale) return;
    const newPath = getLocalizedPathname(pathname, next);
    const query = searchParams.toString();
    router.push(query ? `${newPath}?${query}` : newPath);
  }

  const isCompact = size === "sm";

  return (
    <div
      role="group"
      aria-label={dict.language.label}
      className={`inline-flex items-center rounded-full border border-border/80 bg-surface/80 backdrop-blur-sm transition-colors duration-200 ${
        isCompact ? "p-0.5" : "p-1"
      } ${className}`}
    >
      {locales.map((l) => {
        const selected = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            aria-pressed={selected}
            aria-label={l === "en" ? dict.language.english : dict.language.amharic}
            className={`rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-reduce:transition-none ${
              isCompact
                ? "min-w-[56px] px-2.5 py-1 text-xs"
                : "min-w-[72px] px-3.5 py-1.5 text-sm"
            } ${
              selected
                ? "bg-brand text-primary-foreground font-semibold shadow-xs border border-brand/20"
                : "text-muted-foreground hover:text-foreground hover:bg-surface/50 border border-transparent"
            }`}
          >
            {l === "en" ? dict.language.english : dict.language.amharic}
          </button>
        );
      })}
    </div>
  );
}
