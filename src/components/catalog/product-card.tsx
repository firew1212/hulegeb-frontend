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
  const isAmharic = locale === "am";

  const image = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const alt =
    (isAmharic ? image?.altTextAm : image?.altTextEn) ||
    (isAmharic ? product.titleAm : product.titleEn);
  const title = isAmharic ? product.titleAm : product.titleEn;
  const category = isAmharic ? product.category.nameAm : product.category.nameEn;
  const description = isAmharic ? product.descriptionAm : product.descriptionEn;

  const conditionLabel =
    product.condition === "NEW"
      ? dict.catalog.conditionNew
      : product.condition === "USED"
        ? dict.catalog.conditionUsed
        : dict.catalog.conditionRefurbished;

  const conditionDotClass =
    product.condition === "NEW"
      ? "bg-emerald-500"
      : product.condition === "USED"
        ? "bg-amber-500"
        : "bg-brand";

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-card transition-all duration-300 ease-apple hover:-translate-y-1 hover:border-brand/40 hover:shadow-floating motion-reduce:transform-none motion-reduce:transition-none",
        className,
      )}
    >
      <Link
        href={`/${locale}/products/${product.id}`}
        className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {/* Square Media Showcase with Frosted Condition Badge */}
        <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-muted/30 to-muted/60 p-4 sm:p-5">
          {/* Condition Badge (Apple-Style Frosted Pill) */}
          <div className="absolute left-3 top-3 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-glass bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur-md shadow-xs">
              <span
                className={cn("h-1.5 w-1.5 shrink-0 rounded-full", conditionDotClass)}
                aria-hidden="true"
              />
              <span>{conditionLabel}</span>
            </span>
          </div>

          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.imageUrl}
              alt={alt ?? ""}
              loading="lazy"
              className="h-full w-full object-contain object-center transition-transform duration-300 ease-apple group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/60">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-9 w-9 text-muted-foreground/40"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
              <span className="text-xs font-medium">{dict.common.noImage}</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {category}
          </p>

          <h3
            className={cn(
              "text-[15px] sm:text-base font-semibold tracking-tight text-foreground line-clamp-2 transition-colors duration-200 group-hover:text-brand",
              isAmharic ? "leading-relaxed" : "leading-snug",
            )}
          >
            {title}
          </h3>

          {description ? (
            <p
              className={cn(
                "text-xs sm:text-sm text-muted-foreground line-clamp-2",
                isAmharic ? "leading-relaxed" : "leading-normal",
              )}
            >
              {description}
            </p>
          ) : null}

          {/* Pricing & Call-to-action Footer */}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3">
            <span className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {priceRange(product.variants, locale)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand transition-colors duration-200 group-hover:text-brand-hover">
              <span>{dict.common.viewDetails}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5 transition-transform duration-200 ease-apple group-hover:translate-x-0.5 motion-reduce:transform-none"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

