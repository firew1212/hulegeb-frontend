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
  parent?: Pick<Category, "id" | "slug" | "nameEn" | "nameAm"> | null;
  children?: Category[];
};

export type CreateCategoryInput = {
  slug: string;
  nameEn: string;
  nameAm: string;
  descriptionEn?: string;
  descriptionAm?: string;
  parentId?: string;
  sortOrder?: number;
};

export type UpdateCategoryInput = {
  slug?: string;
  nameEn?: string;
  nameAm?: string;
  descriptionEn?: string | null;
  descriptionAm?: string | null;
  parentId?: string | null;
  sortOrder?: number;
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

export type SellerProductStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "UNAVAILABLE"
  | "REMOVED";

export type SellerProductVariant = ProductVariant & {
  sku: string;
  isActive: boolean;
};

export type SellerProductImage = ProductImage & {
  id: string;
};

export type SellerProduct = Omit<Product, "variants" | "images"> & {
  status: SellerProductStatus;
  variants: SellerProductVariant[];
  images: SellerProductImage[];
};

export type AdminProduct = SellerProduct & {
  seller: {
    id: string;
    displayName: string;
    legalName: string | null;
    status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
  };
};

export type PendingAdminProduct = AdminProduct & {
  status: "PENDING_APPROVAL";
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