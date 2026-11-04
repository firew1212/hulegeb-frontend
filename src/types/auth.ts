export type AuthTokens = {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
  user?: AuthUser;
};

export type AuthRole = "BUYER" | "SELLER" | "ADMIN" | "DELIVERY_STAFF";

export type SellerStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export type AuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  status: string;
  emailVerified: boolean;
  roles: AuthRole[];
  sellerStatus: SellerStatus | null;
};

export type LoginResponse =
  | {
      mfaRequired: true;
      mfaEmail: string;
      message: string;
    }
  | AuthTokens;

export type RegisterInput = {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  termsVersion: string;
  acceptedTerms: true;
};