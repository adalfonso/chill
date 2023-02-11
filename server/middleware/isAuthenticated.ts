import passport from "passport";
import { Cache, getTokenKey } from "@server/lib/data/Cache";
import { Request, Response, NextFunction } from "express";

const login_redirect = "/auth/login";

export const hasValidToken = passport.authenticate("jwt", {
  session: false,
  failureRedirect: login_redirect,
});

export const tokenNotExpired = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies.access_token;
  const is_blacklisted = await Cache.instance().get(getTokenKey(token));

  if (is_blacklisted !== null) {
    console.warn("User tried to authenticate with blacklisted JWT");
    return res.redirect(301, login_redirect);
  }

  next();
};

export const isAuthenticated = [hasValidToken, tokenNotExpired];
