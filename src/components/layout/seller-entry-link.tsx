"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { useLocale } from "@/i18n/provider";
import { useAuth } from "@/lib/auth-context";
import { getDashboardPath } from "@/lib/dashboard";

type SellerEntryLinkProps = {
  children: ReactNode;
  className: string;
  onClick?: () => void;
};

export function SellerEntryLink({
  children,
  className,
  onClick,
}: SellerEntryLinkProps) {
  const locale = useLocale();
  const { status, user } = useAuth();
  const destination =
    status !== "authenticated" || !user
      ? `/${locale}/login`
      : user.roles.includes("SELLER") && user.sellerStatus === "APPROVED"
        ? `/${locale}${getDashboardPath(user) ?? "/dashboard/seller"}`
        : `/${locale}/seller-application`;

  return (
    <Link href={destination} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
