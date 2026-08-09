import jwt from "jsonwebtoken";
import path from "node:path";
import { Request, Response } from "express";
import { nanoid } from "nanoid";

import { ChillWss } from "@server/registerServerSocket";
import { env } from "@server/init";
import { ACCESS_TOKEN_TTL_SECONDS } from "@server/lib/auth/constants";
import { loginSessionService } from "@server/lib/auth/LoginSession";

// Client-supplied per ADR-0009 KTD5, but authCallback is reached via a
// full-page redirect from Google's OAuth callback rather than client JS, so
// there is no header to read it from yet. Falling back to a cookie here
// keeps a login working before U7 gives the client its own localStorage-
// backed device id; a first-time visitor gets one minted and echoed back.
const readOrCreateDeviceId = (req: Request, res: Response): string => {
  const existing = req.cookies?.device_id;

  if (typeof existing === "string" && existing.length > 0) {
    return existing;
  }

  const device_id = nanoid();

  res.cookie("device_id", device_id, {
    httpOnly: false,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 400 * 24 * 60 * 60 * 1000,
  });

  return device_id;
};

export const AuthController = {
  login: (_req: Request, res: Response) =>
    res.sendFile(path.join(path.resolve(), "views/login.html")),

  logout: (wss: ChillWss) => async (req: Request, res: Response) => {
    wss.drop(req._user.session_id);
    await loginSessionService.instance().revoke(req._user.login_session_id);

    res.clearCookie("access_token");
    res.redirect("/auth/login");
  },

  authCallback: async (req: Request, res: Response) => {
    if (req.user === undefined) {
      console.error("OAuth callback reached authCallback without req.user");
      return res.redirect("/auth/login?failure=true");
    }

    const device_id = readOrCreateDeviceId(req, res);
    const session_id = nanoid(4);

    // The refresh token minted here is not yet persisted to a cookie -- the
    // refresh cookie's scheme (path scoping, attributes) is U11's job. It
    // becomes reachable once /auth/refresh and the cookie helper land.
    const { login_session_id } = await loginSessionService.instance().create({
      user_id: req.user.id,
      device_id,
      user_agent: req.headers["user-agent"] ?? "",
      ip: req.ip ?? "",
    });

    const signingCallback = async (
      err: Error | null,
      token: string | undefined,
    ) => {
      if (err || token === undefined) {
        console.error(`Failed to create JWT: ${err}`);
        return res.redirect("/");
      }

      // No maxAge here yet -- ADR-0009 defect 1, fixed explicitly in U11
      // alongside the rest of the cookie scheme.
      res
        .cookie("access_token", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: env.NODE_ENV === "production",
        })
        .redirect("/");
    };

    jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        session_id,
        login_session_id,
        typ: "access",
      },
      env.SIGNING_KEY,
      {
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        header: { alg: "HS256", typ: "access" },
      },
      signingCallback,
    );
  },
};
