"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getLocalizedPathname, locales, type Locale } from "@/i18n/config";
import { useDictionary, useLocale } from "@/i18n/provider";

export function LanguageSwitcher() {
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

  return (
    <div
      role="group"
      aria-label={dict.language.label}
      className="inline-flex items-center rounded-full border border-control-border bg-muted/40 p-1 transition-colors"
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
            className={`min-w-[72px] rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
              selected
                ? "bg-accent-soft text-brand shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l === "en" ? dict.language.english : dict.language.amharic}
          </button>
        );
      })}
    </div>
  );
}
