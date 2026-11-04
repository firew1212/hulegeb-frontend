// In-memory access-token holder only.
//
// Refresh tokens are now delivered by the backend as an HttpOnly cookie and are
// never readable by JavaScript. The frontend stores only the access token in
// memory.

let accessToken: string | null = null;

export function setAuthTokens(tokens: { accessToken: string }) {
  accessToken = tokens.accessToken;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAuthTokens() {
  accessToken = null;
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}