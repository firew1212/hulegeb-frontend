export type SellerType = "INDIVIDUAL" | "BUSINESS";

export type SellerApplicationInput = {
  sellerType: SellerType;
  displayName: string;
  legalName?: string;
};

export type SellerApplication = {
  id: string;
  sellerType: SellerType;
  displayName: string;
  legalName: string | null;
  status: "PENDING_APPROVAL";
  createdAt: string;
};
