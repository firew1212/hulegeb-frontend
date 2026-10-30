import Link from "next/link";
export const instant = false;
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductRail } from "@/components/catalog/product-rail";
import { listCategories, listProducts } from "@/lib/api";

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
  const childCategories = categoryList.flatMap((c) => c.children ?? []);
  return (
    <main>
      <section className="section overflow-hidden"><Container>
        <div className="max-w-xl">
          <p className="text-sm font-medium text-accent">{dict.home.heroEyebrow}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">{dict.home.heroTitle}</h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{dict.home.heroDescription}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href={`/${locale}/catalog`} size="lg">{dict.home.browseCatalog}</Button>
            <Button href="#categories" variant="ghost" size="lg">{dict.home.exploreCategories}</Button>
          </div>
        </div>
      </Container></section>
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
        {categoryList.length === 0 && childCategories.length === 0 ? <p className="text-sm text-muted-foreground">{dict.home.categoriesUnavailable}</p> : null}
      </Container></section>
      <section className="section border-t border-border"><Container>
        <SectionHeading eyebrow={dict.home.productsEyebrow} title={dict.home.productsTitle} description={dict.home.productsDescription} />
        <div className="mt-10">
          {products.length ? (
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
