"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useDictionary } from "@/i18n/provider";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export interface DashboardSidebarProps {
  items: DashboardNavItem[];
  title?: string;
  footer?: React.ReactNode;
  className?: string;
}

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

export function DashboardSidebar({ items, title, footer, className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const dict = useDictionary();
  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col",
        className,
      )}
    >
      {title ? (
        <div className="flex h-16 items-center border-b border-border px-5">
          <span className="text-base font-semibold tracking-tight text-foreground">{title}</span>
        </div>
      ) : null}
      <nav aria-label={dict.dashboard.navigation} className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none",
                    active
                      ? "bg-accent-soft text-brand"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.icon ? (
                    <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                      {item.icon}
                    </span>
                  ) : null}
                  <span className="truncate">{item.label}</span>
                  {active ? (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {footer ? <div className="border-t border-border p-4">{footer}</div> : null}
    </aside>
  );
}