import jwt from "jsonwebtoken";
import path from "node:path";
import { Request, Response } from "express";
import { nanoid } from "nanoid";

import { blacklistToken } from "@server/lib/data/Cache";
import { env } from "@server/init";

// Six hours
export const jwt_expiration_seconds = 3600 * 6;

export const AuthController = {
  login: (_req: Request, res: Response) =>
    res.sendFile(path.join(path.resolve(), "views/login.html")),

  logout: async (req: Request, res: Response) => {
    const token = req.cookies?.access_token;

    if (token) {
      await blacklistToken(token);
    } else {
      console.warn(
        "Unable to find access_token cookie when a user logged out",
        req.user?.email,
      );
    }

    res.clearCookie("access_token");
    res.redirect("/auth/login");
  },

  authCallback: (req: Request, res: Response) => {
    const signingCallback = async (
      err: Error | null,
      token: string | undefined,
    ) => {
      if (err || token === undefined) {
        console.error(`Failed to create JWT: ${err}`);
        return res.redirect("/");
      }

      res
        .cookie("access_token", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: env.NODE_ENV === "production",
        })
        .redirect("/");
    };

    jwt.sign(
      { user: req.user, session_id: nanoid(4) },
      env.SIGNING_KEY,
      { expiresIn: jwt_expiration_seconds },
      signingCallback,
    );
  },
};
