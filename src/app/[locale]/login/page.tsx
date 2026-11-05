import Client from "./client";
import { isLocale } from "@/i18n/config";

export const instant = false;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

function getSafeProductReturnTo(
  returnTo: string | string[] | undefined,
  locale: string,
): string | undefined {
  if (typeof returnTo !== "string" || returnTo.startsWith("//")) return undefined;

  const url = new URL(returnTo, "https://hulegeb.invalid");
  if (
    url.origin !== "https://hulegeb.invalid" ||
    !url.pathname.startsWith(`/${locale}/products/`) ||
    url.pathname === `/${locale}/products/`
  ) {
    return undefined;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export default async function Page({ params, searchParams }: Props) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const returnTo = getSafeProductReturnTo(query.returnTo, locale);
  return <Client returnTo={returnTo} />;
}
