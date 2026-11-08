"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { useDictionary, useLocale } from "@/i18n/provider";
import { Button } from "@/components/ui/button";

type HeroSearchProps = {
  id?: string;
  compact?: boolean;
};

export function HeroSearch({
  id = "hero-search",
  compact = false,
}: HeroSearchProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const query = value.trim();
    const url = query
      ? `/${locale}/catalog?q=${encodeURIComponent(query)}`
      : `/${locale}/catalog`;
    router.push(url);
  }

  return (
    <form
      onSubmit={submit}
      className={`flex w-full items-center gap-2 border border-control-border bg-surface transition-colors focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-ring/30 motion-reduce:transition-none ${
        compact ? "rounded-xl p-1" : "rounded-2xl p-1.5 shadow-lift sm:rounded-full"
      }`}
    >
      <span
        className={`shrink-0 text-brand ${compact ? "pl-2" : "pl-3"}`}
        aria-hidden="true"
      >
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
          compact ? "h-9 text-sm" : "h-12 text-sm sm:text-base"
        }`}
      />
      <Button
        type="submit"
        variant="accent"
        size={compact ? "sm" : "md"}
        className={`shrink-0 border border-brand bg-brand text-primary-foreground hover:bg-brand-hover ${
          compact ? "rounded-lg px-3" : "rounded-full px-4 sm:px-6"
        }`}
      >
        {dict.catalog.searchLabel}
      </Button>
    </form>
  );
}
