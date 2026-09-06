import path from "node:path";
import { Request, Response } from "express";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";

import { ChillWss } from "@server/registerServerSocket";
import { db } from "@server/lib/data/db";
import {
  loginSessionService,
  RotateResult,
} from "@server/lib/auth/LoginSession";
import { revokeAndDisconnect } from "@server/lib/auth/revokeAndDisconnect";
import {
  access_token_payload_schema,
  signAccessToken,
  verifyAndDecodeJwt,
} from "@server/lib/Token";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAccessTokenCookieOptions,
  clearRefreshTokenCookieOptions,
  readOrCreateDeviceId,
  recoverOrCreateSessionId,
  setAuthCookies,
} from "@server/lib/auth/cookies";

// Must match `appId` in capacitor.config.ts. Used to hand control back to the
// native app after Google login completes in a Custom Tab.
const NATIVE_APP_SCHEME = "com.adalfonso.chill";

export const AuthController = {
  loginPage: (_req: Request, res: Response) =>
    res.sendFile(path.join(path.resolve(), "views/login.html")),

  logout: (wss: ChillWss) => async (req: Request, res: Response) => {
    try {
      // No owner_user_id: req._user.login_session_id already came from a
      // verified, deny-list-checked access token, so there's nothing left
      // to scope against (see revokeAndDisconnect's docblock).
      await revokeAndDisconnect(req._user.login_session_id, wss);
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
    const is_native = req.query?.state === "native";

    if (req.user === undefined) {
      console.error("OAuth callback reached authCallback without req.user");

      if (is_native) {
        return res.redirect(nativeCallbackUrl());
      }

      return res.redirect("/auth/login?failure=true");
    }

    const device_id = readOrCreateDeviceId(req, res);
    const session_id = nanoid(4);

    let login_session_id: number;
    let refresh_token: string;

    try {
      ({ login_session_id, refresh_token } = await loginSessionService
        .instance()
        .create({
          user_id: req.user.id,
          device_id,
          user_agent: req.headers["user-agent"] ?? "",
          ip: req.ip ?? "",
        }));
    } catch (err) {
      console.error("Failed to create login session during OAuth callback", {
        err,
      });

      if (is_native) {
        return res.redirect(nativeCallbackUrl());
      }

      return res.redirect("/auth/login?failure=true");
    }

    try {
      const access_token = signAccessToken({
        user_id: req.user.id,
        email: req.user.email,
        session_id,
        login_session_id,
      });

      if (is_native) {
        // This response is served to the Custom Tab's own Chrome instance,
        // which has a cookie jar separate from the app's WebView, so
        // `res.cookie` here would never reach the app. Hand the signed
        // tokens to the app via deep link instead and let
        // `nativeTokenExchange` set the cookies from a request that
        // actually originates from the WebView.
        return res.redirect(nativeCallbackUrl({ access_token, refresh_token }));
      }

      setAuthCookies(res, access_token, refresh_token).redirect("/");
    } catch (err) {
      console.error(`Failed to create JWT: ${err}`);

      if (is_native) {
        return res.redirect(nativeCallbackUrl());
      }

      res.redirect("/");
    }
  },

  /**
   * Rotate a refresh token, minting a fresh access/refresh pair
   *
   * Requires a non-simple header (defense in depth alongside the refresh
   * cookie's SameSite=Strict and scoped path) and re-reads the User row,
   * refusing to mint if it is gone. Takes `wss` (curried, matching
   * `logout`) so a reuse-triggered revocation can drop the live sockets of
   * the session it just revoked -- `LoginSessionService` itself stays
   * ignorant of the socket server (see `LoginSession.ts`'s `revoke` docblock).
   *
   * @param wss - socket server, used only when rotation reveals reuse
   * @param req - express request
   * @param res - express response
   */
  refresh: (wss: ChillWss) => async (req: Request, res: Response) => {
    if (typeof req.headers["x-requested-with"] !== "string") {
      return res.status(400).json({ error: "Missing required header" });
    }

    const refresh_token = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (typeof refresh_token !== "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let result: RotateResult;
    let login_session: Prisma.LoginSessionGetPayload<{
      include: { user: true };
    }> | null;

    try {
      result = await loginSessionService.instance().rotate({
        refresh_token,
        user_agent: req.headers["user-agent"] ?? "",
        ip: req.ip ?? "",
      });

      if (!result.ok) {
        // Only a reuse-triggered revocation carries this -- an invalid,
        // expired, or already-revoked token has no newly-live sockets to
        // drop beyond what was already dropped when the family was first
        // revoked.
        if (result.revoked_login_session_id !== undefined) {
          wss.dropByLoginSession(result.revoked_login_session_id);
        }
        return res.status(401).json({ error: "Unauthorized" });
      }

      login_session = await db.loginSession.findUnique({
        where: { id: result.login_session_id },
        include: { user: true },
      });
    } catch (err) {
      console.error("Failed to rotate refresh token during refresh", { err });
      return res.status(500).json({ error: "Failed to refresh" });
    }

    if (login_session === null) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { user } = login_session;
    const session_id = recoverOrCreateSessionId(req);

    try {
      const access_token = signAccessToken({
        user_id: user.id,
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

  /**
   * Redeem a native login's deep-linked access/refresh token pair for cookies
   *
   * The Custom Tab used for native Google login has its own cookie jar,
   * separate from the app's WebView, so the cookies set at the end of the
   * web OAuth flow never reach the app. The deep link instead carries the
   * already-signed access token and the opaque refresh token, and the
   * WebView redeems them here so `Set-Cookie` lands in its own cookie jar.
   *
   * @param req - request with `access_token` and `refresh_token` (from the
   *   deep link) in the JSON body
   * @param res - response
   */
  nativeTokenExchange: async (req: Request, res: Response) => {
    const access_token: unknown = req.body?.access_token;
    const refresh_token: unknown = req.body?.refresh_token;

    if (typeof access_token !== "string" || typeof refresh_token !== "string") {
      return res.status(400).json({ error: "Missing token" });
    }

    try {
      await verifyAndDecodeJwt(access_token, access_token_payload_schema);
    } catch (error) {
      console.error("Failed to verify native auth token", error);
      return res.status(401).json({ error: "Invalid token" });
    }

    setAuthCookies(res, access_token, refresh_token).status(204).send();
  },
};

/**
 * Build the native app's deep-link callback URL
 *
 * With no `tokens`, the app regains focus (the Custom Tab closes on any
 * `auth/callback` link) without completing login -- used on every failure
 * path above.
 *
 * @param tokens - the access/refresh pair to hand off, omitted on failure
 * @returns the `NATIVE_APP_SCHEME://auth/callback` deep link
 */
const nativeCallbackUrl = (tokens?: {
  access_token: string;
  refresh_token: string;
}): string => {
  if (tokens === undefined) {
    return `${NATIVE_APP_SCHEME}://auth/callback`;
  }

  return `${NATIVE_APP_SCHEME}://auth/callback?${new URLSearchParams(tokens).toString()}`;
};
