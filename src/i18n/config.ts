export const locales = ["en", "am"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

const localizedPaths = new Set([
  "",
  "/auth/logout",
  "/cart",
  "/catalog",
  "/checkout",
  "/dashboard/admin",
  "/dashboard/admin/categories",
  "/dashboard/admin/orders",
  "/dashboard/admin/product-moderation",
  "/dashboard/admin/seller-applications",
  "/dashboard/buyer",
  "/dashboard/buyer/notifications",
  "/dashboard/buyer/orders",
  "/dashboard/seller",
  "/dashboard/seller/notifications",
  "/dashboard/seller/products",
  "/dashboard/seller/products/new",
  "/forgot-password",
  "/login",
  "/profile",
  "/register",
  "/reset-password",
  "/seller-application",
  "/verify-admin-mfa",
  "/verify-email",
]);

export function getLocalizedPathname(pathname: string, locale: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  const routeSegments = isLocale(segments[0] ?? "") ? segments.slice(1) : segments;
  const route = routeSegments.length ? `/${routeSegments.join("/")}` : "";
  const hasEquivalentRoute =
    localizedPaths.has(route) ||
    /^\/products\/[^/]+$/.test(route) ||
    /^\/dashboard\/buyer\/orders\/[^/]+$/.test(route) ||
    /^\/dashboard\/seller\/products\/[^/]+$/.test(route);

  return `/${locale}${hasEquivalentRoute ? route : ""}`;
}
