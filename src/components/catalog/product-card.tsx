"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { priceRange } from "@/lib/money";
import type { Product } from "@/types/catalog";
import { useDictionary, useLocale } from "@/i18n/provider";

type ProductCardProps = {
  product: Product;
  className?: string;
  locale?: string;
};

export function ProductCard({ product, className, locale: localeProp }: ProductCardProps) {
  const dict = useDictionary();
  const contextLocale = useLocale();
  const locale = localeProp ?? contextLocale;
  const image = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const alt = (locale === "am" ? image?.altTextAm : image?.altTextEn) || (locale === "am" ? product.titleAm : product.titleEn);
  const title = locale === "am" ? product.titleAm : product.titleEn;
  const category = locale === "am" ? product.category.nameAm : product.category.nameEn;
  const description = locale === "am" ? product.descriptionAm : product.descriptionEn;

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <Link
        href={`/${locale}/products/${product.id}`}
        className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.imageUrl}
              alt={alt ?? ""}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              {dict.common.noImage}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            {category}
          </p>
          <h3 className="text-base font-semibold tracking-tight text-foreground line-clamp-2">
            {title}
          </h3>
          {description ? (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          ) : null}
          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="text-sm font-semibold text-foreground">
              {priceRange(product.variants, locale)}
            </span>
            <span className="text-xs text-accent">{dict.common.viewDetails}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
