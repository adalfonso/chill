import type { PrismaClient } from "@prisma/client";

import { DenyList, DenyListClient } from "@server/lib/auth/DenyList";
import { generateRefreshToken, hashRefreshToken } from "@server/lib/Token";
import { ABSOLUTE_WINDOW_MS, IDLE_WINDOW_MS } from "@server/lib/auth/constants";

const GRACE_WINDOW_MS = 30_000;
const MAX_DEVICE_LABEL_LENGTH = 64;

const BROWSER_TOKENS: Array<[RegExp, string]> = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/CriOS\//, "Chrome"],
  [/Chrome\//, "Chrome"],
  [/FxiOS\//, "Firefox"],
  [/Firefox\//, "Firefox"],
  [/Safari\//, "Safari"],
];

const PLATFORM_TOKENS: Array<[RegExp, string]> = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Mac OS X/, "macOS"],
  [/Windows/, "Windows"],
  [/Linux/, "Linux"],
];

/**
 * Derive a short, display-safe device label from a User-Agent header
 *
 * Matched against a small fixed allowlist rather than stored verbatim --
 * the raw header is client-controlled and unbounded (ADR-0009 U2).
 *
 * @param user_agent - the request's User-Agent header
 * @returns a label like "Chrome on Windows", capped to the schema's column length
 */
export const deriveDeviceLabel = (user_agent: string): string => {
  const browser = matchToken(user_agent, BROWSER_TOKENS) ?? "Unknown browser";
  const platform =
    matchToken(user_agent, PLATFORM_TOKENS) ?? "unknown platform";

  return `${browser} on ${platform}`.slice(0, MAX_DEVICE_LABEL_LENGTH);
};

const matchToken = (user_agent: string, tokens: Array<[RegExp, string]>) =>
  tokens.find(([pattern]) => pattern.test(user_agent))?.[1];

export type LoginSessionParams = {
  user_id: number;
  device_id: string;
  user_agent: string;
  ip: string;
};

export type RotateParams = {
  refresh_token: string;
  user_agent: string;
  ip: string;
};

export type RotateResult =
  | { ok: true; login_session_id: number; refresh_token: string }
  | { ok: false; revoked_login_session_id?: number };

type RefreshTokenWithRelations = {
  id: number;
  token_hash: string;
  login_session_id: number;
  rotated_at: Date | null;
  expires_at: Date;
  issued_ip: string;
  issued_user_agent: string;
  login_session: {
    id: number;
    revoked_at: Date | null;
    idle_expires_at: Date;
    absolute_expires_at: Date;
  };
  rotated_to: { rotated_at: Date | null } | null;
};

/**
 * Own creation, rotation, grace, reuse detection, and revocation of login sessions
 *
 * Takes `db` and the deny list as parameters rather than importing the
 * singletons, so the rotation CAS can be exercised against a real database
 * or a fake that faithfully models it (ADR-0009 KTD13).
 *
 * @param db - Prisma client (or a structurally compatible fake for tests)
 * @param deny_list - deny list used to enforce revocation on the next request
 * @param grace_cache - Redis-shaped client used for the 30s post-rotation grace entry (ADR-0009 KTD14)
 * @returns create/rotate/revoke/prune bound to the given dependencies
 */
export const createLoginSessionService = (
  db: PrismaClient,
  deny_list: DenyList,
  grace_cache: DenyListClient,
) => {
  /**
   * Look up a refresh token by hash or id, with the relations `rotate` needs
   *
   * @param where - `token_hash` for the initial lookup, `id` for the re-read after a lost CAS race
   * @returns the token with its login session and successor, or null if no row matches
   */
  const findTokenWithRelations = (
    where: { token_hash: string } | { id: number },
  ) =>
    db.refreshToken.findUnique({
      where,
      include: { login_session: true, rotated_to: true },
    }) as Promise<RefreshTokenWithRelations | null>;

  /**
   * Start or restart a login session on one device
   *
   * Upserts on (user_id, device_id): a re-login on the same device reuses
   * the row (the schema's compound unique constraint allows only one) but
   * starts a new token family. Any token from the previous generation that
   * was never rotated is expired immediately so it fails quietly as an
   * ordinary miss rather than staying live under the restarted session.
   *
   * @param params - the user, device, and request identity to bind the session to
   * @returns the session id and a plaintext refresh token
   */
  const create = async ({
    user_id,
    device_id,
    user_agent,
    ip,
  }: LoginSessionParams): Promise<{
    login_session_id: number;
    refresh_token: string;
  }> => {
    const now = new Date();
    const device_label = deriveDeviceLabel(user_agent);
    const idle_expires_at = new Date(now.getTime() + IDLE_WINDOW_MS);
    const absolute_expires_at = new Date(now.getTime() + ABSOLUTE_WINDOW_MS);

    const session = await db.loginSession.upsert({
      where: { user_id_device_id: { user_id, device_id } },
      create: {
        user_id,
        device_id,
        device_label,
        last_seen_at: now,
        idle_expires_at,
        absolute_expires_at,
      },
      update: {
        device_label,
        last_seen_at: now,
        revoked_at: null,
        idle_expires_at,
        absolute_expires_at,
      },
    });

    await db.refreshToken.updateMany({
      where: { login_session_id: session.id, rotated_at: null },
      data: { expires_at: now },
    });

    const refresh_token = generateRefreshToken();

    await db.refreshToken.create({
      data: {
        token_hash: hashRefreshToken(refresh_token),
        login_session_id: session.id,
        expires_at: idle_expires_at,
        issued_ip: ip,
        issued_user_agent: user_agent,
      },
    });

    return { login_session_id: session.id, refresh_token };
  };

  /**
   * Revoke a login session
   *
   * `revoked_at` committing is the revocation (ADR-0009 KTD6); a failed
   * deny-key write degrades enforcement on already-issued access tokens
   * but does not fail the call, since failing it would leave the owner
   * unable to kill a stolen device exactly when the cache is down (R8).
   * Idempotent: revoking an already-revoked session is a no-op success that
   * does not re-write the deny key -- Redis's `SET ... EX` always resets the
   * TTL, so an unguarded repeat call would silently extend enforcement's
   * cache lifetime on every retry.
   *
   * The single owner-scoping entry point for every caller: logout and reuse
   * detection call it with no `owner_user_id` (they already trust the
   * session id they're holding); the login-session-list revoke endpoint
   * passes the caller's own id so a login session can never be revoked (or
   * have its revoked state used to answer an existence question) by anyone
   * but its owner, in the same atomic update rather than a separate
   * look-up-then-check (that pattern is both a race and an existence
   * oracle). Funneling every entry point through this one function is what
   * KTD6 requires.
   *
   * @param login_session_id - the login session to revoke
   * @param options.owner_user_id - if set, the update (and the disambiguation read below) are scoped to sessions owned by this user
   * @returns `ok: false` only when `owner_user_id` was set and the session is not owned by that user (or does not exist) -- otherwise always `ok: true`
   */
  const revoke = async (
    login_session_id: number,
    options: { owner_user_id?: number } = {},
  ): Promise<{ ok: boolean; login_session_id: number }> => {
    const owner_scope =
      options.owner_user_id !== undefined
        ? { user_id: options.owner_user_id }
        : {};

    const updated = await db.loginSession.updateMany({
      where: { id: login_session_id, revoked_at: null, ...owner_scope },
      data: { revoked_at: new Date() },
    });

    if (updated.count === 0) {
      if (options.owner_user_id === undefined) {
        // No owner scope was requested, so a miss here only ever means
        // "already revoked" -- idempotent success, and the deny key must
        // not be re-written (see docblock).
        return { ok: true, login_session_id };
      }

      // Disambiguate "not owned or doesn't exist" from "owned but already
      // revoked" with a follow-up read scoped by the same owner
      // constraint, so it can only ever confirm rows the caller already
      // owns -- never an existence oracle for another user's session.
      const already_revoked_and_owned = await db.loginSession.findFirst({
        where: {
          id: login_session_id,
          user_id: options.owner_user_id,
          revoked_at: { not: null },
        },
        select: { id: true },
      });

      return {
        ok: already_revoked_and_owned !== null,
        login_session_id,
      };
    }

    try {
      await deny_list.deny(login_session_id);
    } catch (err) {
      console.error(
        "Deny-key write failed after revocation committed; enforcement is degraded until warm-up or token expiry",
        { login_session_id, err },
      );
    }

    return { ok: true, login_session_id };
  };

  /**
   * Determine whether a replayed (already-rotated) token gets grace or trips reuse detection
   *
   * Only the immediate predecessor of the current live token is graced, and
   * only inside the 30-second window -- an older ancestor (one whose
   * successor has itself already been rotated) trips detection regardless
   * of timing (ADR-0009 KTD3).
   *
   * Both outcomes are logged (KTD17): the response is a generic failure
   * either way, so the log stream is the only channel that distinguishes a
   * benign lost-response race from actual reuse.
   *
   * @param token - the already-rotated token that failed the rotation CAS
   * @param current - the presenting request's identity, logged against what was originally recorded on the token
   * @returns the graced successor, or a failure -- carrying `revoked_login_session_id`
   *   only when this call is what newly revoked the family, so a caller with
   *   a socket server (unlike this service, which stays ignorant of it, see
   *   `revoke`'s docblock) knows to drop the live connections. The HTTP
   *   response built from this failure stays generic either way (KTD17):
   *   this field is for server-side use, never echoed to the client.
   */
  const disambiguateReplay = async (
    token: RefreshTokenWithRelations,
    current: { user_agent: string; ip: string },
  ): Promise<RotateResult> => {
    const now = Date.now();
    const is_immediate_predecessor =
      token.rotated_to !== null && token.rotated_to.rotated_at === null;
    const within_grace_window =
      token.rotated_at !== null &&
      now - token.rotated_at.getTime() <= GRACE_WINDOW_MS;

    if (is_immediate_predecessor && within_grace_window) {
      const cached = await grace_cache.get(graceCacheKeyFor(token.token_hash));

      if (cached !== null) {
        // Same IP/UA as issuance points to a client retry; a mismatch is
        // the only signal (short of the timing already being inside the
        // window) that this might be a timed replay instead.
        console.info("Graced refresh-token replay", {
          login_session_id: token.login_session_id,
          token_id: token.id,
          current_ip: current.ip,
          original_ip: token.issued_ip,
          current_user_agent: current.user_agent,
          original_user_agent: token.issued_user_agent,
        });

        return {
          ok: true,
          login_session_id: token.login_session_id,
          refresh_token: cached,
        };
      }

      // KTD14: a cache miss inside the window is an ordinary lost-response
      // race, not reuse -- treating it as reuse would manufacture the
      // forced logout this work exists to prevent.
      return { ok: false };
    }

    const family_size = await db.refreshToken.count({
      where: { login_session_id: token.login_session_id },
    });

    console.error("Refresh token reuse detected -- revoking family", {
      login_session_id: token.login_session_id,
      token_id: token.id,
      predecessor_age_ms:
        token.rotated_at !== null ? now - token.rotated_at.getTime() : null,
      family_size_revoked: family_size,
    });

    await revoke(token.login_session_id);
    return { ok: false, revoked_login_session_id: token.login_session_id };
  };

  /**
   * Rotate a refresh token, minting a new access/refresh pair
   *
   * Checks the revoked-family cap and expiry before attempting the CAS
   * (ADR-0009 KTD2): a single `updateMany` guarded on `rotated_at: null`,
   * atomic under Postgres READ COMMITTED. On CAS loss, disambiguates
   * between a graced in-window replay and genuine reuse.
   *
   * @param params - the presented refresh token and the request identity to record on its successor
   * @returns the new refresh token on success, or a generic failure
   */
  const rotate = async ({
    refresh_token,
    user_agent,
    ip,
  }: RotateParams): Promise<RotateResult> => {
    const token_hash = hashRefreshToken(refresh_token);
    const now = new Date();

    const token = await findTokenWithRelations({ token_hash });

    if (token === null) {
      return { ok: false };
    }

    if (token.login_session.revoked_at !== null) {
      // R13: the revoked-family cap -- fail without re-running revocation.
      return { ok: false };
    }

    if (
      token.login_session.idle_expires_at <= now ||
      token.login_session.absolute_expires_at <= now ||
      token.expires_at <= now
    ) {
      return { ok: false };
    }

    if (token.rotated_at !== null) {
      return disambiguateReplay(token, { user_agent, ip });
    }

    const successor_token = generateRefreshToken();
    const successor_hash = hashRefreshToken(successor_token);
    const new_idle_expires_at = new Date(now.getTime() + IDLE_WINDOW_MS);

    const cas_result = await db.$transaction(async (tx) => {
      const updated = await tx.refreshToken.updateMany({
        where: { id: token.id, rotated_at: null },
        data: { rotated_at: now },
      });

      if (updated.count === 0) {
        return null;
      }

      const successor = await tx.refreshToken.create({
        data: {
          token_hash: successor_hash,
          login_session_id: token.login_session_id,
          expires_at: new_idle_expires_at,
          issued_ip: ip,
          issued_user_agent: user_agent,
        },
      });

      await tx.refreshToken.update({
        where: { id: token.id },
        data: { rotated_to_id: successor.id },
      });

      await tx.loginSession.update({
        where: { id: token.login_session_id },
        data: { last_seen_at: now, idle_expires_at: new_idle_expires_at },
      });

      return successor;
    });

    if (cas_result === null) {
      // Lost the race to a concurrent rotation -- re-read and disambiguate
      // exactly like an ordinary replay would be.
      const fresh = await findTokenWithRelations({ id: token.id });

      return disambiguateReplay(fresh!, { user_agent, ip });
    }

    await grace_cache.set(graceCacheKeyFor(token_hash), successor_token, {
      EX: GRACE_WINDOW_MS / 1000,
    });

    return {
      ok: true,
      login_session_id: token.login_session_id,
      refresh_token: successor_token,
    };
  };

  /**
   * Delete login sessions past either expiry
   *
   * @returns the number of rows removed
   */
  const prune = async (): Promise<{ count: number }> => {
    const now = new Date();

    return db.loginSession.deleteMany({
      where: {
        OR: [
          { idle_expires_at: { lte: now } },
          { absolute_expires_at: { lte: now } },
        ],
      },
    });
  };

  return { create, rotate, revoke, prune };
};

const graceCacheKeyFor = (predecessor_token_hash: string) =>
  `grace.refresh_token.${predecessor_token_hash}`;

export type LoginSessionService = ReturnType<typeof createLoginSessionService>;

let login_session_service_instance: LoginSessionService | undefined;

/** Process-wide `LoginSessionService` singleton, mirroring `Cache.instance()` */
export const loginSessionService = {
  /**
   * Create the singleton
   *
   * @param db - Prisma client
   * @param deny_list - deny list used to enforce revocation
   * @param grace_cache - Redis-shaped client for the rotation grace entry
   */
  init: (
    db: PrismaClient,
    deny_list: DenyList,
    grace_cache: DenyListClient,
  ): void => {
    login_session_service_instance = createLoginSessionService(
      db,
      deny_list,
      grace_cache,
    );
  },

  /**
   * Get the singleton
   *
   * @throws when accessed before `init`
   */
  instance: (): LoginSessionService => {
    if (!login_session_service_instance) {
      throw new Error("LoginSessionService accessed before init");
    }

    return login_session_service_instance;
  },
};

const DEFAULT_SESSION_PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Start the periodic login-session pruner
 *
 * There is no existing scheduler in this codebase to reuse -- library
 * scanning is admin-pull only. Mirrors startRenditionWorker's setInterval
 * shape instead, the only other periodic scaffolding here: a reentrancy
 * flag so a slow tick can't overlap itself, and a caught/logged failure
 * that leaves the interval running rather than crashing the process.
 *
 * @param interval_ms - how often to sweep; defaults to once a day
 */
export const startSessionPruner = (
  interval_ms: number = DEFAULT_SESSION_PRUNE_INTERVAL_MS,
): void => {
  console.info(`Session pruner: starting (interval_ms=${interval_ms})`);

  let pruning = false;

  const tick = () => {
    if (pruning) {
      return;
    }

    pruning = true;

    loginSessionService
      .instance()
      .prune()
      .then(({ count }) => {
        if (count > 0) {
          console.info(
            `Session pruner: removed ${count} expired login session(s)`,
          );
        }
      })
      .catch((error) => console.error("Session pruner tick failed", { error }))
      .finally(() => {
        pruning = false;
      });
  };

  setInterval(tick, interval_ms);
};
