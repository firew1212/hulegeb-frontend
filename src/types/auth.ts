export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
  user?: unknown;
};

export type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
};