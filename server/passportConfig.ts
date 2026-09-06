import { PassportStatic } from "passport";
import { Request } from "express";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { UserType } from "@prisma/client";
import { VerifyCallback } from "passport-google-oauth2";

import { db } from "./lib/data/db";
import { env } from "./init";

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

    const existing_user = await db.user.findUnique({
      where: { email },
      include: { settings: true },
    });

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
      include: { settings: true },
    });

    return done(null, new_user);
  } catch (error) {
    console.error(error);
    return done("Failed to verify google auth", false);
  }
}
