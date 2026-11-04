"use client";

import { cn } from "@/lib/utils";
import { useDictionary } from "@/i18n/provider";

export interface DashboardTopbarProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  userLabel?: string;
  onSignOut?: () => void;
  signOutLabel?: string;
  className?: string;
}

export function DashboardTopbar({
  title,
  subtitle,
  actions,
  userLabel,
  onSignOut,
  signOutLabel,
  className,
}: DashboardTopbarProps) {
  const dict = useDictionary();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 sm:gap-4 sm:px-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {title ? <h1 className="truncate text-base font-semibold text-foreground">{title}</h1> : null}
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {actions}
        {userLabel ? <span className="hidden max-w-40 truncate text-sm font-medium text-foreground md:block">{userLabel}</span> : null}
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className="min-h-10 shrink-0 rounded-full border border-control-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none"
          >
            {signOutLabel ?? dict.auth.logoutTitle}
          </button>
        ) : null}
      </div>
    </header>
  );
}