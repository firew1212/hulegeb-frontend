import Client from "./client";
import { isLocale } from "@/i18n/config";
import { getSafeReturnTo } from "@/lib/dashboard";

export const instant = false;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const returnTo = getSafeReturnTo(query.returnTo, locale);
  return <Client returnTo={returnTo} />;
}
