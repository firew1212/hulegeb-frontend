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

export type PendingSellerApplication = SellerApplication & {
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
};

export type SellerApplicationDecision = {
  id: string;
  userId: string;
  sellerType: SellerType;
  displayName: string;
  legalName: string | null;
  status: "APPROVED" | "REJECTED";
  approvedAt?: string;
};
