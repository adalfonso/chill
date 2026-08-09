import jwt from "jsonwebtoken";
import path from "node:path";
import { Request, Response } from "express";
import { nanoid } from "nanoid";

import { ChillWss } from "@server/registerServerSocket";
import { env } from "@server/init";
import { db } from "@server/lib/data/db";
import { ACCESS_TOKEN_TTL_SECONDS } from "@server/lib/auth/constants";
import { loginSessionService } from "@server/lib/auth/LoginSession";
import { AccessTokenPayload } from "@server/lib/Token";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
  clearAccessTokenCookieOptions,
  clearRefreshTokenCookieOptions,
  refreshTokenCookieOptions,
} from "@server/lib/auth/cookies";

const DEVICE_ID_COOKIE = "device_id";

// Client-supplied per ADR-0009 KTD5, but authCallback is reached via a
// full-page redirect from Google's OAuth callback rather than client JS, so
// there is no header to read it from yet. Falling back to a cookie here
// keeps a login working before U7 gives the client its own localStorage-
// backed device id; a first-time visitor gets one minted and echoed back.
const readOrCreateDeviceId = (req: Request, res: Response): string => {
  const existing = req.cookies?.[DEVICE_ID_COOKIE];

  if (typeof existing === "string" && existing.length > 0) {
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
 * Sign an access token
 *
 * @param identity - the payload to sign
 * @returns the signed JWT
 * @throws when signing fails
 */
const signAccessToken = (identity: Omit<AccessTokenPayload, "typ">): string =>
  jwt.sign({ ...identity, typ: "access" }, env.SIGNING_KEY, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    header: { alg: "HS256", typ: "access" },
  });

/**
 * Set the access and refresh cookies on a response
 *
 * @param res - express response
 * @param access_token - signed access token
 * @param refresh_token - plaintext refresh token
 * @returns `res`, for chaining a terminal call
 */
const setAuthCookies = (
  res: Response,
  access_token: string,
  refresh_token: string,
): Response =>
  res
    .cookie(ACCESS_TOKEN_COOKIE, access_token, accessTokenCookieOptions())
    .cookie(REFRESH_TOKEN_COOKIE, refresh_token, refreshTokenCookieOptions());

export const AuthController = {
  login: (_req: Request, res: Response) =>
    res.sendFile(path.join(path.resolve(), "views/login.html")),

  logout: (wss: ChillWss) => async (req: Request, res: Response) => {
    wss.drop(req._user.session_id);

    try {
      await loginSessionService.instance().revoke(req._user.login_session_id);
    } catch (err) {
      console.error("Failed to revoke login session on logout", { err });
      return res.status(500).json({ error: "Failed to log out" });
    }

    res
      .clearCookie(ACCESS_TOKEN_COOKIE, clearAccessTokenCookieOptions())
      .clearCookie(REFRESH_TOKEN_COOKIE, clearRefreshTokenCookieOptions())
      .status(200)
      .json({ ok: true });
  },

  authCallback: async (req: Request, res: Response) => {
    if (req.user === undefined) {
      console.error("OAuth callback reached authCallback without req.user");
      return res.redirect("/auth/login?failure=true");
    }

    const device_id = readOrCreateDeviceId(req, res);
    const session_id = nanoid(4);

    const { login_session_id, refresh_token } = await loginSessionService
      .instance()
      .create({
        user_id: req.user.id,
        device_id,
        user_agent: req.headers["user-agent"] ?? "",
        ip: req.ip ?? "",
      });

    try {
      const access_token = signAccessToken({
        id: req.user.id,
        email: req.user.email,
        session_id,
        login_session_id,
      });

      setAuthCookies(res, access_token, refresh_token).redirect("/");
    } catch (err) {
      console.error(`Failed to create JWT: ${err}`);
      res.redirect("/");
    }
  },

  /**
   * Rotate a refresh token, minting a fresh access/refresh pair
   *
   * Requires a non-simple header (defense in depth alongside the refresh
   * cookie's SameSite=Strict and scoped path) and re-reads the User row,
   * refusing to mint if it is gone.
   *
   * @param req - express request
   * @param res - express response
   */
  refresh: async (req: Request, res: Response) => {
    if (typeof req.headers["x-requested-with"] !== "string") {
      return res.status(400).json({ error: "Missing required header" });
    }

    const refresh_token = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (typeof refresh_token !== "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await loginSessionService.instance().rotate({
      refresh_token,
      user_agent: req.headers["user-agent"] ?? "",
      ip: req.ip ?? "",
    });

    if (!result.ok) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const login_session = await db.loginSession.findUnique({
      where: { id: result.login_session_id },
      include: { user: true },
    });

    if (login_session === null) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { user } = login_session;
    const session_id =
      typeof req.body?.session_id === "string"
        ? req.body.session_id
        : nanoid(4);

    try {
      const access_token = signAccessToken({
        id: user.id,
        email: user.email,
        session_id,
        login_session_id: result.login_session_id,
      });

      setAuthCookies(res, access_token, result.refresh_token)
        .status(200)
        .json({ ok: true });
    } catch (err) {
      console.error(`Failed to create JWT during refresh: ${err}`);
      res.status(500).json({ error: "Failed to refresh" });
    }
  },
};
