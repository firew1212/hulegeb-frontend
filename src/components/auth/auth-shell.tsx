import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="section">
      <div className="container-page">
        <div className="grid overflow-hidden rounded-3xl border border-border bg-background shadow-soft lg:grid-cols-[1fr_0.28fr]">
          <div className="p-6 sm:p-8 lg:p-10 animate-fade-up">
            <div className="mb-6 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {children}
            {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
          </div>
          <div className="relative hidden bg-gradient-to-br from-brand to-accent-deep lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
            <div className="relative flex h-full items-end p-6">
              <div className="space-y-2 text-accent-foreground">
                <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur" />
                <p className="text-sm font-medium opacity-90">Hulegeb</p>
              </div>
            </div>
            <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-white/10 animate-float" />
          </div>
          <div className="lg:hidden h-2 bg-gradient-to-r from-accent to-accent-deep" />
        </div>
      </div>
    </section>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-danger" role="alert">{message}</p>;
}

export function inputClass() {
  return cn(
    "h-11 w-full rounded-lg border border-control-border bg-surface px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground",
    "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
  );
}