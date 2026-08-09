import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Cache, getTokenKey } from "@server/lib/data/Cache";
import { env } from "@server/init";
import { z, ZodType } from "zod";

export const tokenIsBlacklisted = async (token: string): Promise<boolean> => {
  return Boolean(await Cache.instance().get(getTokenKey(token)));
};

/**
 * Manually verify and parse a JWT against an expected payload schema
 *
 * The schema is a required argument rather than an afterthought so that
 * parsing is never optional at a call site -- a cast token can no longer be
 * silently accepted where an access token is expected, or vice versa
 * (ADR-0009 KTD7).
 *
 * @param token - JWT
 * @param schema - Zod schema the decoded payload must satisfy
 * @returns the parsed, schema-validated payload
 * @throws when the token is blacklisted, fails signature/algorithm
 *   verification, or the decoded payload does not match `schema`
 */
export const verifyAndDecodeJwt = async <T>(
  token: string,
  schema: ZodType<T>,
): Promise<T> => {
  if (await tokenIsBlacklisted(token)) {
    throw new Error(`Unable to parse blacklisted token`);
  }

  const decoded = jwt.verify(token, env.SIGNING_KEY, {
    algorithms: ["HS256"],
  });

  return schema.parse(decoded);
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

// What a cast token -- minted per track for Chromecast playback -- must
// contain. The `typ` discriminator is what makes it structurally distinct
// from an access token, so the two can never be substituted for one another
// (ADR-0009 KTD7, R11). Binding a cast token to a login session
// (`login_session_id`) lands once U4/U6 give the request a real one to bind
// to; adding it here would have nothing genuine to populate it with.
export const cast_token_payload_schema = z.object({
  for: z.string(),
  track_id: z.number().int(),
  album_art_filename: z.string().nullable(),
  typ: z.literal("cast"),
});

export type CastTokenPayload = z.infer<typeof cast_token_payload_schema>;

const REFRESH_TOKEN_BYTES = 32;

/**
 * Generate a cryptographically random refresh token
 *
 * 256 bits from a CSPRNG, base64url-encoded -- never `nanoid` or
 * `Math.random` (ADR-0009 KTD4).
 *
 * @returns a base64url-encoded refresh token
 */
export const generateRefreshToken = (): string =>
  crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");

/**
 * Hash a refresh token for storage and lookup
 *
 * Stored as an unsalted SHA-256 hash with a unique index. A slow KDF is
 * skipped deliberately: against a 256-bit CSPRNG token there is nothing to
 * guess, so it would buy no security while making the endpoint a DoS
 * amplifier (ADR-0009 KTD4).
 *
 * @param token - the plaintext refresh token
 * @returns the token's SHA-256 hash, hex-encoded
 */
export const hashRefreshToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");
