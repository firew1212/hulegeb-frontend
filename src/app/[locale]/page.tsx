import Link from "next/link";
export const instant = false;
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductRail } from "@/components/catalog/product-rail";
import { HeroSearch } from "@/components/home/hero-search";

import { listCategories, listProducts } from "@/lib/api/catalog";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";

import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type Props = { params: Promise<{ locale: string }> };

export default async function Home({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dict = getDictionary(locale);
  const [categories, productsResult] = await Promise.allSettled([listCategories(), listProducts({ page: 1, limit: 12, sort: "newest" })]);
  const categoryList = categories.status === "fulfilled" ? categories.value : [];
  const products = productsResult.status === "fulfilled" ? productsResult.value.data : [];
  const categoryError =
    categories.status === "rejected"
      ? getLocalizedApiErrorMessage(categories.reason, dict.apiErrors, dict.home.categoriesError)
      : null;
  const productsError =
    productsResult.status === "rejected"
      ? getLocalizedApiErrorMessage(productsResult.reason, dict.apiErrors, dict.home.productsError)
      : null;
  const childCategories = categoryList.flatMap((c) => c.children ?? []);
  return (
    <main>
      <section className="border-b border-border/60 bg-background">
        <Container className="py-6 sm:py-8">
          <HeroSearch />
        </Container>
      </section>
      <section className="section overflow-hidden">
        <Container>
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div className="max-w-xl animate-fade-up">
              <p className="text-sm font-medium text-accent">{dict.home.heroEyebrow}</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl leading-tight">{dict.home.heroTitle}</h1>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">{dict.home.heroDescription}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button href={`/${locale}/catalog`} variant="accent" size="lg">{dict.home.browseCatalog}</Button>
                <Button href="#categories" variant="ghost" size="lg">{dict.home.exploreCategories}</Button>
              </div>
            </div>
            <div className="relative hidden md:block animate-fade-in">
              <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-accent-soft blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent-soft/60 via-background to-background p-8 shadow-soft">
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-[4/5] rounded-2xl bg-accent/10" />
                  <div className="aspect-[4/5] rounded-2xl bg-muted" />
                  <div className="aspect-[4/5] rounded-2xl bg-muted" />
                  <div className="aspect-[4/5] rounded-2xl bg-accent/10" />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
      <section id="categories" className="section border-t border-border bg-muted"><Container>
        <SectionHeading eyebrow={dict.home.categoriesEyebrow} title={dict.home.categoriesTitle} description={dict.home.categoriesDescription} />
        <div className="mt-10 flex flex-wrap gap-4">
          {categoryList.map((category) => (
            <Link key={category.id} href={`/${locale}/catalog?categoryId=${category.id}`} className="group flex min-w-[160px] flex-col rounded-2xl border border-border bg-background p-5">
              <span className="text-sm font-semibold text-foreground">{locale === "am" ? category.nameAm : category.nameEn}</span>
            </Link>
          ))}
          {childCategories.map((child) => (
            <Link key={child.id} href={`/${locale}/catalog?categoryId=${child.id}`} className="group flex min-w-[160px] flex-col rounded-2xl border border-border bg-background p-5">
              <span className="text-sm font-semibold text-foreground">{locale === "am" ? child.nameAm : child.nameEn}</span>
            </Link>
          ))}
        </div>
        {categoryError ? (
          <p className="text-sm text-danger" role="alert">{categoryError}</p>
        ) : categoryList.length === 0 && childCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.home.categoriesUnavailable}</p>
        ) : null}
      </Container></section>
      <section className="section border-t border-border"><Container>
        <SectionHeading eyebrow={dict.home.productsEyebrow} title={dict.home.productsTitle} description={dict.home.productsDescription} />
        <div className="mt-10">
          {productsError ? (
            <p className="text-sm text-danger" role="alert">{productsError}</p>
          ) : products.length ? (
            <ProductRail label={dict.catalog.productRailLabel}>
              {products.map((product) => (<div key={product.id} className="w-[260px] shrink-0 snap-start sm:w-[280px]"><ProductCard product={product} locale={locale} /></div>))}
            </ProductRail>
          ) : (
            <div className="rounded-2xl border border-border bg-muted p-8 text-center">
              <p className="text-sm text-muted-foreground">{dict.home.noProducts}</p>
              <div className="mt-4"><Button href={`/${locale}/catalog`} variant="secondary" size="sm">{dict.home.browseCatalog}</Button></div>
            </div>
          )}
        </div>
      </Container></section>
    </main>
  );
}
