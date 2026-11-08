export type BuyerOrderItem = {
  id: string;
  productId: string;
  variantId: string;
  productNameEn: string;
  productNameAm: string;
  variantName: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
};

export type BuyerOrder = {
  id: string;
  status: string;
  paymentOption: string | null;
  currency: string;
  total: string | number;
  createdAt: string;
  updatedAt: string;
  items: BuyerOrderItem[];
  paymentAmount: string | null;
};

export type AdminOrder = BuyerOrder;

export type OrderContact = {
  phone: string;
  telegram: string;
};