import type { Category } from "@/types/catalog";

export function getCategoryName(category: Category, locale: string) {
  return locale === "am" ? category.nameAm : category.nameEn;
}

export function getCategoryHref(
  locale: string,
  categoryId: string,
  subcategoryId?: string,
) {
  const params = new URLSearchParams({ categoryId });
  if (subcategoryId) params.set("subcategoryId", subcategoryId);
  return `/${locale}/catalog?${params.toString()}`;
}

export function getCategoryChildren(
  category: Category,
  categories: Category[],
) {
  const children =
    category.children?.length
      ? category.children
      : categories.filter((item) => item.parentId === category.id);
  return children.filter((item) => item.isActive !== false);
}
