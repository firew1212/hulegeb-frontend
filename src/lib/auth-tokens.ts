// In-memory token holder only.
//
// Security note: refresh tokens returned by the backend are JSON values, not
// httpOnly cookies. The security requirement for this milestone forbids placing
// refresh tokens in localStorage/sessionStorage. Persisting them across reloads
// therefore requires a documented, secure storage decision (for example backend
// support for httpOnly cookies) that does not currently exist. Tokens are kept
// only in module memory and are lost on full page reload; see the final report.

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setAuthTokens(tokens: { accessToken: string; refreshToken: string }) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function clearAuthTokens() {
  accessToken = null;
  refreshToken = null;
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}