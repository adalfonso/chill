import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { User } from "@server/models/User";

export const AuthController = {
  login: (_req, res) => res.render("pages/login"),

  logout: (_req: Request, res: Response) => {
    res.clearCookie("access_token");

    // TODO: store unexpired tokens in a redis blacklist

    res.redirect("/auth/login");
  },

  authCallback: (req: Request, res: Response) => {
    const signingCallback = (err: Error, token: string) => {
      if (err) {
        console.error(`Failed to create JWT: ${err}`);
        return res.redirect("/");
      }

      // TODO: fix types
      User.updateOne(req.user._id, { access_token: token });

      return res
        .cookie("access_token", token, {
          httpOnly: true,
          sameSite: true,
          //signed: true,
          secure: true,
        })
        .redirect("/");
    };

    jwt.sign(
      { user: req.user },
      process.env.JWT_SIGNING_KEY,
      { expiresIn: "1h" },
      signingCallback,
    );
  },
};
