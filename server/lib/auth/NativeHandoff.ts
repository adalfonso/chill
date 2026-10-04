import crypto from "node:crypto";
import { createClient } from "redis";

/** The Redis connection type, as exposed by `Cache.instance()` */
type CacheClient = ReturnType<typeof createClient>;

/** The token pair a native login hands from the Custom Tab to the app */
export type NativeHandoff = {
  access_token: string;
  refresh_token: string;
  /** Base64url SHA-256 of the app's secret verifier (see `isValidChallenge`) */
  challenge: string;
};

/**
 * How long a handoff code may sit unredeemed
 *
 * The code only has to survive the hop from the Custom Tab back to the app, so
 * it is kept short: a leaked deep link goes stale quickly even if the
 * verifier check were somehow bypassed.
 */
export const HANDOFF_TTL_SECONDS = 60;

const STATE_PREFIX = "native.";
const KEY_PREFIX = "native_handoff:";
const CODE_BYTES = 32;

/** Base64url SHA-256 digest: 32 bytes -> 43 chars, no padding */
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * Check that a value is a well-formed PKCE-style challenge
 *
 * @param value - the candidate challenge (typically a query-string value)
 * @returns true when it is a base64url-encoded SHA-256 digest
 */
export const isValidChallenge = (value: unknown): value is string =>
  typeof value === "string" && CHALLENGE_PATTERN.test(value);

/**
 * Encode a challenge as the OAuth `state` value for a native login
 *
 * The OAuth `state` is the only thing that survives the round trip through
 * Google (no server session exists to stash it in), so it carries the
 * challenge to `/auth/google/cb`. The `native.` prefix is how the callback
 * tells a native login from a web one.
 *
 * @param challenge - a valid challenge, see `isValidChallenge`
 * @returns the `state` value to pass to the OAuth provider
 */
export const nativeState = (challenge: string): string =>
  `${STATE_PREFIX}${challenge}`;

/**
 * Recover the challenge from an OAuth `state` value
 *
 * @param state - the `state` query value on the OAuth callback, if any
 * @returns the challenge when `state` encodes a native login, otherwise
 *   `undefined` (a web login, or a malformed/forged `state`)
 */
export const challengeFromState = (state: unknown): string | undefined => {
  if (typeof state !== "string" || !state.startsWith(STATE_PREFIX)) {
    return undefined;
  }

  const challenge = state.slice(STATE_PREFIX.length);

  return isValidChallenge(challenge) ? challenge : undefined;
};

/**
 * Park a token pair behind a short-lived, single-use code
 *
 * The deep link back to the app carries only this code, never the tokens, so
 * an app that intercepts the link (custom URL schemes are not verified by
 * Android) cannot use it without also knowing the verifier.
 *
 * @param cache - the Redis connection
 * @param handoff - the tokens to hold, and the challenge they are bound to
 * @returns the opaque code to put in the deep link
 * @throws when the cache write fails
 */
export const storeHandoff =
  (cache: CacheClient) =>
  async (handoff: NativeHandoff): Promise<string> => {
    const code = crypto.randomBytes(CODE_BYTES).toString("base64url");

    await cache.set(keyFor(code), JSON.stringify(handoff), {
      EX: HANDOFF_TTL_SECONDS,
    });

    return code;
  };

/**
 * Redeem a handoff code for its token pair
 *
 * The entry is deleted as it is read (`GETDEL`), so a code works at most once
 * and two racing redemptions cannot both succeed. That also means a wrong
 * verifier burns the code rather than allowing repeated guesses.
 *
 * @param cache - the Redis connection
 * @param code - the code from the deep link
 * @param verifier - the app's secret, whose SHA-256 must match the challenge
 *   stored at login start
 * @returns the tokens, or `undefined` when the code is unknown, expired,
 *   already used, or the verifier does not match
 * @throws when the cache read fails
 */
export const redeemHandoff =
  (cache: CacheClient) =>
  async (
    code: string,
    verifier: string,
  ): Promise<NativeHandoff | undefined> => {
    const raw = await cache.getDel(keyFor(code));

    if (raw === null) {
      return undefined;
    }

    const handoff: NativeHandoff = JSON.parse(raw);

    return verifierMatches(handoff.challenge, verifier) ? handoff : undefined;
  };

/**
 * Build the Redis key for a handoff code
 *
 * @param code - the handoff code
 * @returns the namespaced cache key
 */
const keyFor = (code: string): string => `${KEY_PREFIX}${code}`;

/**
 * Check a verifier against a stored challenge in constant time
 *
 * @param challenge - base64url SHA-256 digest stored at login start
 * @param verifier - the secret presented at redemption
 * @returns true when `sha256(verifier)` equals the challenge
 */
const verifierMatches = (challenge: string, verifier: string): boolean => {
  const actual = crypto.createHash("sha256").update(verifier).digest();
  const expected = Buffer.from(challenge, "base64url");

  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  );
};
