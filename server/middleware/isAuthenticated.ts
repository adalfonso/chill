import { Request, Response, NextFunction } from "express";

import {
  access_token_payload_schema,
  verifyAndDecodeJwt,
} from "@server/lib/Token";
import { db } from "@server/lib/data/db";
import { denyList } from "@server/lib/auth/DenyList";
import { ACCESS_TOKEN_COOKIE } from "@server/lib/auth/cookies";

const login_redirect = "/auth/login";

/**
 * Authenticate an `/api/v1` request, responding with JSON on failure
 *
 * @param req - express request
 * @param res - express response
 * @param next - next function
 */
export const isAuthenticatedApi = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (await authenticate(req)) {
    return next();
  }

  console.warn("Rejected an unauthenticated API request", req.originalUrl);
  res.status(401).json({ error: "Unauthorized" });
};

/**
 * Authenticate a shell (page) request, redirecting to login on failure
 *
 * Never a permanent (301) redirect -- ADR-0009 defect 3 made a dead session
 * cacheable as if it were a real page move.
 *
 * @param req - express request
 * @param res - express response
 * @param next - next function
 */
export const isAuthenticatedPage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (await authenticate(req)) {
    return next();
  }

  res.redirect(302, login_redirect);
};

/**
 * Verify the access token cookie and populate `req._user`/`req.user`
 *
 * Shared by `isAuthenticatedApi` and `isAuthenticatedPage`: both need the
 * same verify-plus-deny-list check, differing only in how they report
 * failure. `req.user` is refreshed from the database on every request
 * (never trusted from the token) so a revoked admin or deleted user is
 * never silently believed (ADR-0009 R16).
 *
 * @param req - express request
 * @returns true on success (request is authenticated), false on any failure
 */
const authenticate = async (req: Request): Promise<boolean> => {
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE];

  if (typeof token !== "string") {
    return false;
  }

  try {
    const decoded = await verifyAndDecodeJwt(
      token,
      access_token_payload_schema,
    );

    // Independent reads -- run concurrently rather than paying two
    // sequential round trips on every authenticated request.
    const [is_denied, user] = await Promise.all([
      denyList.instance().isDenied(decoded.login_session_id),
      db.user.findUnique({
        where: { id: decoded.user_id },
        include: { settings: true },
      }),
    ]);

    if (is_denied || user === null) {
      return false;
    }

    Object.assign(req, { _user: decoded, user });

    return true;
  } catch (_err) {
    return false;
  }
};
