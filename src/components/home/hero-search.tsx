"use client";

import { type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useDictionary, useLocale } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { useMarketplaceSearch } from "@/components/home/marketplace-search-context";

type HeroSearchProps = {
  id?: string;
  compact?: boolean;
  featured?: boolean;
};

export function HeroSearch({
  id = "hero-search",
  compact = false,
  featured = false,
}: HeroSearchProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const { value, setValue } = useMarketplaceSearch();

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const query = value.trim();
    const url = query
      ? `/${locale}/catalog?q=${encodeURIComponent(query)}`
      : `/${locale}/catalog`;
    router.push(url);
  }

  const form = (
    <form
      onSubmit={submit}
      className={`flex w-full items-center gap-2 bg-surface transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-ring/30 motion-reduce:transition-none ${
        compact
          ? "h-12 rounded-full border-2 border-brand/70 p-1 shadow-flat hover:border-brand hover:shadow-soft"
          : featured
            ? "h-16 rounded-[1.2rem] border border-white/80 p-2 shadow-lift hover:shadow-glow-brand sm:h-[5rem] sm:rounded-full sm:p-2.5"
            : "rounded-2xl border border-control-border p-1.5 shadow-lift sm:rounded-full"
      }`}
    >
      <span className="shrink-0 pl-3 text-muted-foreground" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      </span>
      <label className="sr-only" htmlFor={id}>{dict.catalog.searchLabel}</label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={dict.catalog.searchPlaceholder}
        className={`min-w-0 flex-1 bg-transparent px-2 text-foreground placeholder:text-muted-foreground focus:outline-none ${
          compact
            ? "h-10 text-sm"
            : featured
              ? "h-12 text-sm sm:h-14 sm:text-lg"
              : "h-12 text-sm sm:text-base"
        }`}
      />
      <Button
        type="submit"
        variant="accent"
        size={compact ? "sm" : "md"}
        aria-label={dict.catalog.searchLabel}
        className={`shrink-0 border border-brand bg-brand text-primary-foreground hover:bg-brand-hover ${
          compact
            ? "h-10 rounded-full px-3.5 sm:px-5"
            : featured
                ? "h-12 rounded-full px-6 text-sm font-semibold shadow-soft sm:h-16 sm:px-10 sm:text-lg"
              : "h-10 rounded-full px-4 sm:px-6"
        }`}
      >
        <span className={compact ? "hidden sm:inline" : undefined}>
          {dict.catalog.searchLabel}
        </span>
        {compact ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 sm:hidden"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        ) : null}
      </Button>
    </form>
  );

  return featured ? (
    <div className="rounded-[1.2rem] bg-gradient-to-r from-[#cbbdff] via-brand to-[#e9ddff] p-[2px] shadow-lift transition-shadow duration-300 hover:shadow-glow-brand motion-reduce:transition-none sm:rounded-full">
      {form}
    </div>
  ) : (
    form
  );
}
