import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "@server/init";
import { z, ZodType } from "zod";

import { ACCESS_TOKEN_TTL_SECONDS } from "@server/lib/auth/constants";

/**
 * Manually verify and parse a JWT against an expected payload schema
 *
 * The schema is a required argument rather than an afterthought so that
 * parsing is never optional at a call site -- a cast token can no longer be
 * silently accepted where an access token is expected, or vice versa
 * (ADR-0009 KTD7). Revocation is no longer checked here: it moved to a
 * deny-list lookup keyed on `login_session_id`, which callers run
 * separately, since the blacklist scheme this replaced could only key on
 * the token itself (ADR-0009 KTD6, U6).
 *
 * @param token - JWT
 * @param schema - Zod schema the decoded payload must satisfy
 * @returns the parsed, schema-validated payload
 * @throws when the token fails signature/algorithm verification, or the
 *   decoded payload does not match `schema`
 */
export const verifyAndDecodeJwt = async <T>(
  token: string,
  schema: ZodType<T>,
): Promise<T> => {
  const decoded = jwt.verify(token, env.SIGNING_KEY, {
    algorithms: ["HS256"],
  });

  return schema.parse(decoded);
};

// What we expect the JWT to contain. Identity is flattened (not an embedded
// Prisma user object) and carries no privilege claim -- admin_procedure
// reads `type` from the database at the point of use instead, so a
// demotion takes effect immediately rather than after up to
// ACCESS_TOKEN_TTL_SECONDS (ADR-0009 KTD16). `session_id` is the unrelated
// low-entropy *device* session used for WebSocket routing (see
// docs/glossary.md); `login_session_id` is the login session this token
// belongs to, checked against the deny list on every request.
export const access_token_payload_schema = z.object({
  id: z.number().int(),
  email: z.string(),
  session_id: z.string(),
  login_session_id: z.number().int(),
  typ: z.literal("access"),
});

export type AccessTokenPayload = z.infer<typeof access_token_payload_schema>;

/**
 * Sign an access token
 *
 * @param identity - the payload to sign
 * @returns the signed JWT
 * @throws when signing fails
 */
export const signAccessToken = (
  identity: Omit<AccessTokenPayload, "typ">,
): string =>
  jwt.sign({ ...identity, typ: "access" }, env.SIGNING_KEY, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    header: { alg: "HS256", typ: "access" },
  });

// What a cast token -- minted per track for Chromecast playback -- must
// contain. The `typ` discriminator is what makes it structurally distinct
// from an access token, so the two can never be substituted for one another
// (ADR-0009 KTD7, R11). `login_session_id` binds the token to a revocable
// session, checked against the same deny list as the access-token path.
export const cast_token_payload_schema = z.object({
  for: z.string(),
  track_id: z.number().int(),
  album_art_filename: z.string().nullable(),
  login_session_id: z.number().int(),
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
