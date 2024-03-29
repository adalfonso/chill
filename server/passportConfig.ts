import { Invitation } from "./models/Invitation";
import { PassportStatic } from "passport";
import { Request } from "express";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { Strategy as JwtStrategy, VerifiedCallback } from "passport-jwt";
import { User } from "./models/User";
import { VerifyCallback } from "passport-google-oauth2";
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
  profile: any,
  done: VerifyCallback,
) {
  try {
    const email = profile.emails[0].value;
    const existing_user = await User.findOne({ email });

    if (existing_user) {
      return done(null, existing_user);
    }

    const invitation = await Invitation.findOne({ email });

    if (invitation === null) {
      console.error(`An unauthorized user tried to login: { email: ${email} }`);
      return done(null, false);
    }

    await Invitation.deleteOne({ email });

    console.info("Creating new user...");

    const new_user = new User({
      email,
      type: "user",
      auth: {
        id: profile.id,
        name: profile.displayName,
        email: email,
        type: "google_oauth",
      },
    });

    await new_user.save();
    return done(null, new_user);
  } catch (error) {
    return done(error, false);
  }
}

// What we expect the JWT to contain
const jwt_payload = z.object({
  user: z.object({
    _id: z.string(),
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
    const user = await User.findById(payload.user._id);

    if (user) {
      return done(null, user);
    }

    return done(null, false);
  } catch (error) {
    done(error, false);
  }
}
