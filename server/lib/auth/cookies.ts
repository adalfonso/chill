import { CookieOptions } from "express";

import {
  ACCESS_TOKEN_TTL_SECONDS,
  IDLE_WINDOW_MS,
} from "@server/lib/auth/constants";

// __Host- requires Path=/, which is incompatible with the refresh cookie's
// path scoping (see REFRESH_TOKEN_PATH below), so both use __Secure-
// instead. The prefix silently drops the cookie if Secure isn't also set,
// so `secure` is unconditional -- never NODE_ENV-gated -- for both cookies
// below (ADR-0009 KTD10).
export const ACCESS_TOKEN_COOKIE = "__Secure-access_token";
export const REFRESH_TOKEN_COOKIE = "__Secure-refresh_token";

// Scoped so the longest-lived credential never rides along on the hundreds
// of /api/v1/media/* requests a listening session makes (ADR-0009 KTD10).
export const REFRESH_TOKEN_PATH = "/auth/refresh";

/**
 * Cookie options for the access token
 *
 * @returns options for `res.cookie(ACCESS_TOKEN_COOKIE, token, ...)`
 */
export const accessTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
});

/**
 * Cookie options for the refresh token
 *
 * `sameSite: "strict"` plus the scoped path are the refresh endpoint's
 * primary CSRF defense; the required header it also checks is defense in
 * depth. maxAge matches the session's sliding idle window so the cookie
 * keeps covering it as it slides forward on each rotation.
 *
 * @returns options for `res.cookie(REFRESH_TOKEN_COOKIE, token, ...)`
 */
export const refreshTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: REFRESH_TOKEN_PATH,
  maxAge: IDLE_WINDOW_MS,
});

/**
 * Clear options for the access token
 *
 * `res.clearCookie` needs the same `path` the cookie was set with to
 * actually remove it -- the bare call defaults to `path: "/"`, which
 * matches here but not for the refresh cookie below.
 *
 * @returns options for `res.clearCookie(ACCESS_TOKEN_COOKIE, ...)`
 */
export const clearAccessTokenCookieOptions = (): CookieOptions => ({
  path: "/",
});

/**
 * Clear options for the refresh token
 *
 * @returns options for `res.clearCookie(REFRESH_TOKEN_COOKIE, ...)`
 */
export const clearRefreshTokenCookieOptions = (): CookieOptions => ({
  path: REFRESH_TOKEN_PATH,
});
