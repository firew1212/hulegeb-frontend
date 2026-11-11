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
  if (
    roles.includes("BUYER") &&
    (user?.sellerStatus === "PENDING_APPROVAL" ||
      user?.sellerStatus === "REJECTED" ||
      user?.sellerStatus === "SUSPENDED")
  ) {
    return "/seller-application";
  }
  if (roles.includes("BUYER")) return "/dashboard/buyer";
  return null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isSupportedReturnPath(path: string): boolean {
  const staticPaths = [
    "/profile",
    "/cart",
    "/checkout",
    "/seller-application",
    "/dashboard/buyer",
    "/dashboard/buyer/orders",
    "/dashboard/buyer/notifications",
    "/dashboard/seller",
    "/dashboard/seller/notifications",
    "/dashboard/seller/products",
    "/dashboard/seller/products/new",
    "/dashboard/admin",
    "/dashboard/admin/categories",
    "/dashboard/admin/orders",
    "/dashboard/admin/product-moderation",
    "/dashboard/admin/seller-applications",
  ];
  if (staticPaths.includes(path)) return true;

  const productId = /^\/products\/([^/]+)$/.exec(path)?.[1];
  const orderId = /^\/dashboard\/buyer\/orders\/([^/]+)$/.exec(path)?.[1];
  const sellerProductId =
    /^\/dashboard\/seller\/products\/([^/]+)$/.exec(path)?.[1];
  return [productId, orderId, sellerProductId].some(
    (id) => id !== undefined && UUID_RE.test(id),
  );
}

export function getSafeReturnTo(
  returnTo: string | string[] | undefined,
  locale: string,
): string | undefined {
  if (typeof returnTo !== "string") return undefined;

  let url: URL;
  try {
    url = new URL(returnTo, "https://hulegeb.invalid");
  } catch {
    return undefined;
  }
  const localePrefix = `/${locale}`;
  if (
    url.origin !== "https://hulegeb.invalid" ||
    !(url.pathname === localePrefix ||
      url.pathname.startsWith(`${localePrefix}/`))
  ) {
    return undefined;
  }
  const path = url.pathname.slice(localePrefix.length) || "/";
  if (!isSupportedReturnPath(path)) return undefined;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getAuthorizedReturnTo(
  returnTo: string | undefined,
  user: Pick<AuthUser, "roles" | "sellerStatus"> | null | undefined,
  locale: string,
): string | null {
  if (!returnTo || !user) return null;
  const safeReturnTo = getSafeReturnTo(returnTo, locale);
  if (!safeReturnTo) return null;
  const path = new URL(safeReturnTo, "https://hulegeb.invalid").pathname.slice(
    `/${locale}`.length,
  ) || "/";
  const roles = user.roles ?? [];

  if (path === "/profile" || path.startsWith("/products/")) return safeReturnTo;
  if (
    path === "/cart" ||
    path === "/checkout" ||
    path === "/seller-application" ||
    path === "/dashboard/buyer" ||
    path.startsWith("/dashboard/buyer/")
  ) {
    return roles.includes("BUYER") ? safeReturnTo : null;
  }
  if (
    path === "/dashboard/seller" ||
    path.startsWith("/dashboard/seller/")
  ) {
    return roles.includes("SELLER") && user.sellerStatus === "APPROVED"
      ? safeReturnTo
      : null;
  }
  if (path === "/dashboard/admin" || path.startsWith("/dashboard/admin/")) {
    return roles.includes("ADMIN") ? safeReturnTo : null;
  }
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
