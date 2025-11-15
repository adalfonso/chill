import passport from "passport";
import { Request, Response, NextFunction } from "express";
import { tokenIsBlacklisted, verifyAndDecodeJwt } from "@server/lib/Token";

const login_redirect = "/auth/login";

export const hasValidToken = passport.authenticate("jwt", {
  session: false,
  failureRedirect: login_redirect,
});

export const tokenNotRevoked = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (await tokenIsBlacklisted(req.cookies.access_token)) {
    console.warn("User tried to authenticate with blacklisted JWT");
    return res.redirect(301, login_redirect);
  }

  next();
};

export const storeTokenPayload = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    Object.assign(req, {
      _user: await verifyAndDecodeJwt(req.cookies.access_token),
    });
  } catch (_) {
    return res.redirect(301, login_redirect);
  }

  next();
};

export const isAuthenticated = [
  hasValidToken,
  tokenNotRevoked,
  storeTokenPayload,
];
