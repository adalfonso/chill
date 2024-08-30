import { PassportStatic } from "passport";
import { Request } from "express";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { Strategy as JwtStrategy, VerifiedCallback } from "passport-jwt";
import { UserType } from "@prisma/client";
import { VerifyCallback } from "passport-google-oauth2";

import { db } from "./lib/data/db";
import { env } from "./init";
import { z } from "zod";

export const configurePassport = (passport: PassportStatic) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_OAUTH_ID,
        clientSecret: env.GOOGLE_OAUTH_SECRET,
        callbackURL: `${env.HOST}:${env.APP_PORT}/auth/google/cb`,
        passReqToCallback: true,
      },
      verifyGoogleAuth,
    ),
  );

  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: (req: Request) => req?.cookies?.access_token ?? null,
        secretOrKey: env.SIGNING_KEY,
      },
      verifyJwtAuth,
    ),
  );
};

/**
 * Verify Google OAuth login
 *
 * @param _request - user request
 * @param _access_token - OAuth access token
 * @param _refresh_token - OAuth refresh token
 * @param profile - user info
 * @param done - verification callback
 */
async function verifyGoogleAuth(
  _request: Request,
  _access_token: string,
  _refresh_token: string,
  profile: { emails: Array<{ value: string }> },
  done: VerifyCallback,
) {
  try {
    const email = profile.emails[0].value as string;

    const existing_user = await db.user.findUnique({ where: { email } });

    if (existing_user) {
      return done(null, existing_user);
    }

    const invitation = await db.invitation.findUnique({ where: { email } });

    if (invitation === null) {
      console.error(`An unauthorized user tried to login: { email: ${email} }`);
      return done(null, false);
    }

    await db.invitation.delete({ where: { id: invitation.id } });

    console.info("Creating new user...");

    const new_user = await db.user.create({
      data: {
        email,
        type: UserType.User,
        settings: { create: {} },
      },
    });

    return done(null, new_user);
  } catch (error) {
    console.error(error);
    return done("Failed to verify google auth", false);
  }
}

// What we expect the JWT to contain
const jwt_payload = z.object({
  user: z.object({
    id: z.number().int(),
  }),
});

/**
 * Verify the user from a JWT
 *
 * @param unverified_payload - JWT payload
 * @param done - verification callback
 */
async function verifyJwtAuth(
  unverified_payload: unknown,
  done: VerifiedCallback,
) {
  try {
    const payload = jwt_payload.parse(unverified_payload);
    const user = await db.user.findUnique({ where: { id: payload.user.id } });

    if (user) {
      return done(null, user);
    }

    return done(null, false);
  } catch (error) {
    console.error(error);
    done("Failed to verify token", false);
  }
}
