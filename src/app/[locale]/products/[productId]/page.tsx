import { notFound } from "next/navigation";
export const instant = false;
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { getProduct } from "@/lib/api/catalog";
import { isApiError } from "@/lib/api";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import ProductDetailClient from "./product-detail-client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type Props = { params: Promise<{ locale: string; productId: string }> };

function isUnavailableProductError(error: unknown): boolean {
  return isApiError(error) && (error.status === 404 || error.status === 410);
}

export async function generateMetadata({ params }: Props) {
  const { locale: rawLocale, productId } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dict = getDictionary(locale);
  try {
    const product = await getProduct(productId);
    const title = locale === "am" ? product.titleAm : product.titleEn;
    return {
      title: dict.metadata.productTitle.replace("{title}", title),
      description: (locale === "am" ? product.descriptionAm : product.descriptionEn) ?? dict.metadata.productDescriptionFallback,
    };
  } catch (error) {
    if (isUnavailableProductError(error)) {
      return { title: dict.metadata.notFoundTitle };
    }

    return {
      title: dict.metadata.catalogTitle,
      description: dict.metadata.productDescriptionFallback,
    };
  }
}

export default async function ProductPage({ params }: Props) {
  const { locale: rawLocale, productId } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dict = getDictionary(locale);
  let product: Awaited<ReturnType<typeof getProduct>>;
  try {
    product = await getProduct(productId);
  } catch (error) {
    if (isUnavailableProductError(error)) notFound();

    return (
      <main>
        <section className="section">
          <Container>
            <div className="mb-6">
              <Button href={`/${locale}/catalog`} variant="ghost" size="sm">
                {dict.common.backToCatalog}
              </Button>
            </div>
            <p role="alert" className="text-sm text-destructive">
              {getLocalizedApiErrorMessage(error, dict.apiErrors)}
            </p>
          </Container>
        </section>
      </main>
    );
  }
  return (
    <main>
      <section className="section">
        <Container>
          <div className="mb-6">
            <Button href={`/${locale}/catalog`} variant="ghost" size="sm">
              {dict.common.backToCatalog}
            </Button>
          </div>
          <ProductDetailClient product={product} locale={locale} />
        </Container>
      </section>
    </main>
  );
}
