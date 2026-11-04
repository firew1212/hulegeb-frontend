import { cn } from "@/lib/utils";

export interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className={cn("min-h-screen bg-muted text-foreground", className)}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        {children}
      </div>
    </div>
  );
}