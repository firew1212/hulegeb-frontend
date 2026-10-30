import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LocaleProvider } from "@/i18n/provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = isLocale(locale) ? getDictionary(locale) : getDictionary("en");
  return {
    title: dict.metadata.homeTitle,
    description: dict.metadata.homeDescription,
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <LocaleProvider locale={locale} dictionary={dict}>
      <Header locale={locale} />
      <div className="flex-1">{children}</div>
      <Footer locale={locale} />
    </LocaleProvider>
  );
}
