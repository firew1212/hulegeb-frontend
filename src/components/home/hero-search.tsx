"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { useDictionary, useLocale } from "@/i18n/provider";
import { Button } from "@/components/ui/button";

export function HeroSearch() {
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
    <form onSubmit={submit} className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-full border border-control-border bg-surface p-1.5 transition-colors focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-ring/30 motion-reduce:transition-none">
      <span className="pl-3 text-muted-foreground" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      </span>
      <label className="sr-only" htmlFor="hero-search">{dict.catalog.searchLabel}</label>
      <input
        id="hero-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={dict.catalog.searchPlaceholder}
        className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      <Button type="submit" variant="accent" size="md" className="shrink-0 rounded-full border border-brand bg-surface px-4 text-brand hover:bg-accent-soft sm:px-5">
        {dict.catalog.searchLabel}
      </Button>
    </form>
  );
}
