"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setYear(new Date().getFullYear());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <footer className="border-t border-border bg-muted">
      <div className="container-page flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          &copy; {year ?? ""} Hulegeb. All rights reserved.
        </p>
        <nav aria-label="Footer navigation" className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
        </nav>
      </div>
    </footer>
  );
}
