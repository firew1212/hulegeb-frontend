"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useDictionary } from "@/i18n/provider";
import {
  isDashboardNavItemActive,
  type DashboardNavItem,
} from "./dashboard-sidebar";

export interface DashboardMobileNavProps {
  items: DashboardNavItem[];
  title?: string;
  openLabel?: string;
  closeLabel?: string;
  className?: string;
}

export function DashboardMobileNav({ items, title, openLabel, closeLabel, className }: DashboardMobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const dict = useDictionary();
  const resolvedOpenLabel = openLabel ?? dict.mobileNav.openMenu;
  const resolvedCloseLabel = closeLabel ?? dict.mobileNav.closeMenu;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className={cn("lg:hidden", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="dashboard-mobile-navigation"
        aria-label={open ? resolvedCloseLabel : resolvedOpenLabel}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-control-border bg-surface text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2z" clipRule="evenodd" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label={resolvedCloseLabel}
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setOpen(false)}
          />
          <aside id="dashboard-mobile-navigation" ref={panelRef} className="relative z-10 flex h-full w-[min(20rem,85vw)] flex-col bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              {title ? <span className="text-base font-semibold text-foreground">{title}</span> : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={resolvedCloseLabel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <nav aria-label={dict.dashboard.navigation} className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="flex flex-col gap-1">
                {items.map((item) => {
                  const active = item.href
                    ? isDashboardNavItemActive(pathname, item.href, items)
                    : false;
                  const content = (
                    <>
                      {item.icon ? <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">{item.icon}</span> : null}
                      <span className="truncate">{item.label}</span>
                      {item.marker ? <span className="ml-auto text-[10px] font-semibold tracking-wide text-muted-foreground/70">{item.marker}</span> : null}
                    </>
                  );
                  return (
                    <li key={item.href ?? item.label}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                            active ? "bg-accent-soft text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {content}
                        </Link>
                      ) : (
                        <span aria-disabled="true" className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground/60">
                          {content}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  );
}