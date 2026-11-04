"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useDictionary } from "@/i18n/provider";

export function Footer({ locale }: { locale?: string }) {
  const dict = useDictionary();
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setYear(new Date().getFullYear());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <footer className="border-t border-border bg-muted/60">
      <div className="container-page flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          &copy; {year ?? ""} Hulegeb. {dict.footer.rights}
        </p>
        <nav aria-label={dict.nav.footerNavigation} className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            href={locale ? `/${locale}` : "/"}
            className="text-sm text-muted-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {dict.footer.home}
          </Link>
          <Link
            href={locale ? `/${locale}/catalog` : "/catalog"}
            className="text-sm text-muted-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {dict.nav.catalog}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
