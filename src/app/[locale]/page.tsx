import { ProductCard } from "@/components/catalog/product-card";
import { ProductRail } from "@/components/catalog/product-rail";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { listCategories, listProducts } from "@/lib/api/catalog";
import type { Category, Product, ProductImage } from "@/types/catalog";

import { Reveal } from "@/components/home/reveal";
import { CategoryCard } from "@/components/home/category-card";
import { BackToTop } from "@/components/home/back-to-top";
import { MarketplaceHero } from "@/components/home/marketplace-hero";

export const instant = false;

type Props = { params: Promise<{ locale: string }> };

function categoryIncludesProduct(category: Category, product: Product): boolean {
  return (
    category.id === product.category.id ||
    (category.children ?? []).some((child) =>
      categoryIncludesProduct(child, product),
    )
  );
}

function findCategoryProduct(category: Category, products: Product[]): Product | undefined {
  return products.find(
    (product) =>
      categoryIncludesProduct(category, product) && product.images.length > 0,
  );
}

function getProductImage(product: Product | undefined): ProductImage | undefined {
  return product?.images.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0];
}

export default async function Home({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dict = getDictionary(locale);
  const [categories, productsResult] = await Promise.allSettled([
    listCategories(),
    listProducts({ page: 1, limit: 12, sort: "newest" }),
  ]);
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
  const categoryTiles = categoryList.flatMap((category) => [
    category,
    ...(category.children ?? []),
  ]);

  return (
    <main>
      <MarketplaceHero content={dict.home} />

      <section id="categories" className="section home-categories">
        <Container>
          <Reveal delay={0}>
            <SectionHeading
              eyebrow={dict.home.categoriesEyebrow}
              title={dict.home.categoriesTitle}
            />
          </Reveal>

          {categoryTiles.length > 0 ? (
            <div className="categories-strip">
              {categoryTiles.map((category, index) => {
                const title = locale === "am" ? category.nameAm : category.nameEn;
                const image = getProductImage(findCategoryProduct(category, products));
                return (
                  <Reveal key={category.id} delay={Math.min(200 + index * 100, 900)}>
                    <CategoryCard
                      category={category}
                      title={title}
                      image={image}
                      locale={locale}
                      explore={dict.home.exploreCategories}
                    />
                  </Reveal>
                );
              })}
            </div>
          ) : null}

          {categoryError ? (
            <p className="mt-6 text-sm text-danger" role="alert">
              {categoryError}
            </p>
          ) : categoryTiles.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              {dict.home.categoriesUnavailable}
            </p>
          ) : null}
        </Container>
      </section>

      <section className="section home-products">
        <Container>
          <SectionHeading
            eyebrow={dict.home.productsEyebrow}
            title={dict.home.productsTitle}
            description={dict.home.productsDescription}
          />
          <div className="mt-8">
            {productsError ? (
              <p className="text-sm text-danger" role="alert">
                {productsError}
              </p>
            ) : products.length > 0 ? (
              <ProductRail label={dict.catalog.productRailLabel}>
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="w-[260px] shrink-0 snap-start sm:w-[280px]"
                  >
                    <ProductCard product={product} locale={locale} />
                  </div>
                ))}
              </ProductRail>
            ) : (
              <div className="rounded-2xl border border-border bg-muted p-8 text-center">
                <p className="text-sm text-muted-foreground">{dict.home.noProducts}</p>
              </div>
            )}
          </div>
        </Container>
      </section>

      <BackToTop />
    </main>
  );
}
