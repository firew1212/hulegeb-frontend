import { request } from "@/lib/api";
import type {
  AuthTokens,
  AuthUser,
  LoginResponse,
  RegisterInput,
} from "@/types/auth";

export type AuthMessage = { message: string };

const emailVerificationRequests = new Map<string, Promise<AuthMessage>>();

export function registerUser(input: RegisterInput): Promise<AuthMessage> {
  return request<AuthMessage>("/auth/register", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function loginUser(identifier: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: { identifier, password },
    auth: false,
  });
}

export function verifyAdminMfa(email: string, code: string): Promise<AuthTokens> {
  return request<AuthTokens>("/auth/login/verify-admin-mfa", {
    method: "POST",
    body: { email, code },
    auth: false,
  });
}

export function verifyEmail(token: string): Promise<AuthMessage> {
  const existing = emailVerificationRequests.get(token);
  if (existing) return existing;

  const verification = request<AuthMessage>("/auth/verify-email", {
    method: "POST",
    body: { token },
    auth: false,
  });
  emailVerificationRequests.set(token, verification);
  const clearPendingVerification = () => {
    if (emailVerificationRequests.get(token) === verification) {
      emailVerificationRequests.delete(token);
    }
  };
  void verification.then(clearPendingVerification, clearPendingVerification);
  return verification;
}

export function resendEmailVerification(email: string): Promise<AuthMessage> {
  return request<AuthMessage>("/auth/verification/email/resend", {
    method: "POST",
    body: { email },
    auth: false,
  });
}

export function requestPasswordReset(email: string): Promise<AuthMessage> {
  return request<AuthMessage>("/auth/password/forgot", {
    method: "POST",
    body: { email },
    auth: false,
  });
}

export function resetPassword(token: string, newPassword: string): Promise<AuthMessage> {
  return request<AuthMessage>("/auth/password/reset", {
    method: "POST",
    body: { token, newPassword },
    auth: false,
  });
}

export async function logoutUser(): Promise<AuthMessage | undefined> {
  return request<AuthMessage>("/auth/logout", {
    method: "POST",
    auth: true,
  });
}

export function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", { auth: true });
}

export function updateProfile(input: { firstName: string; lastName: string }): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", {
    method: "PATCH",
    body: input,
    auth: true,
  });
}

export type { AuthUser };
