import jwt from "jsonwebtoken";
import { Cache, getTokenKey } from "@server/lib/data/Cache";
import { env } from "@server/init";
import { z } from "zod";

export const tokenIsBlacklisted = async (token: string): Promise<boolean> => {
  return Boolean(await Cache.instance().get(getTokenKey(token)));
};

/**
 * Manually verify and parse JWT
 *
 * @param token - JWT
 */
export const verifyAndDecodeJwt = async (token: string) => {
  if (await tokenIsBlacklisted(token)) {
    throw new Error(`Unable to parse blacklisted token`);
  }

  // Verifies and decodes
  return jwt.verify(token, env.SIGNING_KEY);
};

// What we expect the JWT to contain
export const access_token_payload_schema = z.object({
  user: z.object({
    id: z.number().int(),
    email: z.string(),
  }),
  session_id: z.string(),
});

export type AccessTokenPayload = z.infer<typeof access_token_payload_schema>;
