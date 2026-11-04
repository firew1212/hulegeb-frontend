import type { AuthUser } from "@/types/auth";
import type { Dictionary } from "@/i18n/dictionaries";

export type OrderStatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export function getDashboardPath(
  user: Pick<AuthUser, "roles" | "sellerStatus"> | null | undefined,
): string | null {
  const roles = user?.roles ?? [];
  if (roles.includes("ADMIN")) return "/dashboard/admin";
  if (roles.includes("SELLER") && user?.sellerStatus === "APPROVED") {
    return "/dashboard/seller";
  }
  if (roles.includes("BUYER")) return "/dashboard/buyer";
  return null;
}

export function getOrderStatusTone(status: string): OrderStatusTone {
  if (status === "COMPLETED") return "success";
  if (status === "CANCELLED") return "danger";
  return "info";
}

export function getOrderStatusLabel(
  status: string,
  labels: Pick<
    Dictionary["dashboard"],
    "statusPending" | "statusCompleted" | "statusCancelled" | "statusUnknown"
  >,
): string {
  if (status === "PENDING") return labels.statusPending;
  if (status === "COMPLETED") return labels.statusCompleted;
  if (status === "CANCELLED") return labels.statusCancelled;
  return labels.statusUnknown;
}

export function getPaymentOptionLabel(
  option: string | null,
  labels: Pick<
    Dictionary["dashboard"],
    "paymentDepositLabel" | "paymentFullLabel" | "noPaymentOption"
  >,
): string {
  if (option === "DEPOSIT") return labels.paymentDepositLabel;
  if (option === "FULL") return labels.paymentFullLabel;
  return option ?? labels.noPaymentOption;
}
