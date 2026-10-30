"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { locales, type Locale } from "@/i18n/config";
import { useDictionary, useLocale } from "@/i18n/provider";

const languageNames: Record<Locale, string> = {
  en: "English",
  am: "አማርኛ›",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const dict = useDictionary();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(next: Locale) {
    if (next === locale) return;
    const segments = pathname.split("/");
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = next;
    } else {
      segments.unshift("", next);
    }
    const newPath = segments.join("/") || `/${next}`;
    const query = searchParams.toString();
    router.push(query ? `${newPath}?${query}` : newPath);
  }

  return (
    <div
      role="group"
      aria-label={dict.language.label}
      className="inline-flex items-center rounded-full border border-border bg-muted/40 p-1 transition-colors"
    >
      {locales.map((l) => {
        const selected = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            aria-pressed={selected}
            aria-label={languageNames[l]}
            className={`min-w-[72px] rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
              selected
                ? "bg-accent/10 text-accent shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {languageNames[l]}
          </button>
        );
      })}
    </div>
  );
}

