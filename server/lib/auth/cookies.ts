import { CookieOptions, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";

import { env } from "@server/init";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  IDLE_WINDOW_MS,
} from "@server/lib/auth/constants";
import { isString } from "@common/commonUtils";

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

const DEVICE_ID_COOKIE = "device_id";

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

// Client-supplied per ADR-0009 KTD5, but authCallback is reached via a
// full-page redirect from Google's OAuth callback rather than client JS, so
// there is no header to read it from yet. Falling back to a cookie here
// keeps a login working before U7 gives the client its own localStorage-
// backed device id; a first-time visitor gets one minted and echoed back.
export const readOrCreateDeviceId = (req: Request, res: Response): string => {
  const existing = req.cookies?.[DEVICE_ID_COOKIE];

  if (isString(existing) && existing.length > 0) {
    return existing;
  }

  const device_id = nanoid();

  res.cookie(DEVICE_ID_COOKIE, device_id, {
    httpOnly: false,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 400 * 24 * 60 * 60 * 1000,
  });

  return device_id;
};

/**
 * Recover the device (socket-routing) session id from the expiring access token
 *
 * `session_id` is not a secret and carries no authority (see
 * docs/glossary.md) -- it only tags which WebSocket connection belongs to
 * this device. Decoded structurally, without verifying the token's
 * signature or expiry, since by the time refresh runs the old access token
 * has often just expired. A live socket connection stays tagged with the
 * value it connected with regardless of later refreshes, so preserving it
 * here (rather than minting a new one) is what keeps `wss.drop` and the
 * device picker's "this device" comparison working after a refresh. Falls
 * back to a fresh id when there's no old token to recover one from (e.g.
 * the very first refresh of a session).
 *
 * @param req - express request
 * @returns the recovered or freshly minted device session id
 */
export const recoverOrCreateSessionId = (req: Request): string => {
  const old_token = req.cookies?.[ACCESS_TOKEN_COOKIE];

  if (isString(old_token)) {
    const decoded = jwt.decode(old_token);

    if (
      decoded !== null &&
      typeof decoded === "object" &&
      isString(decoded.session_id)
    ) {
      return decoded.session_id;
    }
  }

  return nanoid(4);
};

/**
 * Set the access and refresh cookies on a response
 *
 * @param res - express response
 * @param access_token - signed access token
 * @param refresh_token - plaintext refresh token
 * @returns `res`, for chaining a terminal call
 */
export const setAuthCookies = (
  res: Response,
  access_token: string,
  refresh_token: string,
): Response =>
  res
    .cookie(ACCESS_TOKEN_COOKIE, access_token, accessTokenCookieOptions())
    .cookie(REFRESH_TOKEN_COOKIE, refresh_token, refreshTokenCookieOptions());
