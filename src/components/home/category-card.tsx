import Link from "next/link";
import Image from "next/image";

import type { Category, ProductImage } from "@/types/catalog";

type CategoryCardProps = {
  category: Category;
  title: string;
  image: ProductImage | undefined;
  locale: string;
  explore: string;
};

/**
 * Editorial category card for the homepage category discovery section.
 *
 * The entire card is an accessible, keyboard-operable link to the existing
 * catalog filter (`?categoryId=`), preserving existing filtering behavior.
 * The image zooms on hover; each card is wrapped in a scroll-reveal animation
 * driven by the parent page using the `Reveal` foundation.
 */
export function CategoryCard({
  category,
  title,
  image,
  locale,
  explore,
}: CategoryCardProps) {
  const imageAlt =
    (locale === "am" ? image?.altTextAm : image?.altTextEn) ??
    (locale === "am" ? category.nameAm : category.nameEn);

  return (
    <Link
      href={`/${locale}/catalog?categoryId=${category.id}`}
      aria-label={`${explore}: ${title}`}
      className="categories-strip__link"
    >
      <div className="categories-strip__image">
        {image ? (
          <Image
            fill
            src={image.imageUrl}
            alt={imageAlt}
            loading="lazy"
            className="categories-strip__zoom"
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
          />
        ) : (
          <div className="categories-strip__image-placeholder" />
        )}
        <div className="categories-strip__scrim" />
        <div className="categories-strip__content">
          <h3 className="categories-strip__name">{title}</h3>
        </div>
        <div className="categories-strip__footer" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="categories-strip__footer-icon"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}
