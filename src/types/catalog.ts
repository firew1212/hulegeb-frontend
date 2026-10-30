export type Category = {
  id: string;
  slug: string;
  nameEn: string;
  nameAm: string;
  descriptionEn?: string | null;
  descriptionAm?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  children?: Category[];
};

export type ProductImage = {
  imageUrl: string;
  altTextEn?: string | null;
  altTextAm?: string | null;
  sortOrder: number;
};

export type ProductVariant = {
  id: string;
  name: string;
  attributes?: Record<string, unknown> | null;
  price: string | number;
  stockQuantity: number;
};

export type ProductCategory = {
  id: string;
  slug: string;
  nameEn: string;
  nameAm: string;
  descriptionEn?: string | null;
  descriptionAm?: string | null;
};

export type Product = {
  id: string;
  slug: string;
  titleEn: string;
  titleAm: string;
  descriptionEn?: string | null;
  descriptionAm?: string | null;
  condition: "NEW" | "USED" | "REFURBISHED";
  createdAt: string;
  category: ProductCategory;
  variants: ProductVariant[];
  images: ProductImage[];
};

export type ProductListResponse = {
  data: Product[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProductQuery = {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: string;
  subcategoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: "NEW" | "USED" | "REFURBISHED";
  sort?: "newest" | "oldest" | "price_asc" | "price_desc";
};