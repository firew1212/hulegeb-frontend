export type CartItem = {
  variantId: string;
  quantity: number;
  productId: string;
  productNameEn: string;
  productNameAm: string;
  variantName: string;
  unitPrice: string;
  lineTotal: string;
  stockQuantity: number;
  isAvailable: boolean;
};

export type Cart = {
  items: CartItem[];
  total: string;
};