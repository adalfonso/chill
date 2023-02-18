import jwt from "jsonwebtoken";
import path from "node:path";
import { Request, Response } from "express";
import { User } from "@server/models/User";
import { blacklistToken } from "@server/lib/data/Cache";
import { env } from "@server/init";

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

    // TODO: store unexpired tokens in a redis blacklist

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

      try {
        await User.findByIdAndUpdate(req.user?._id, { access_token: token });
      } catch (e) {
        console.error("Failed to store access_token", e);
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
      { user: req.user },
      env.SIGNING_KEY,
      { expiresIn: "1h" },
      signingCallback,
    );
  },
};
