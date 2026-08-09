import type { PrismaClient } from "@prisma/client";

import { DenyList, DenyListClient } from "@server/lib/auth/DenyList";
import { generateRefreshToken, hashRefreshToken } from "@server/lib/Token";

const GRACE_WINDOW_MS = 30_000;
const IDLE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const ABSOLUTE_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_DEVICE_LABEL_LENGTH = 64;

const graceCacheKeyFor = (predecessor_token_hash: string) =>
  `grace.refresh_token.${predecessor_token_hash}`;

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

const matchToken = (user_agent: string, tokens: Array<[RegExp, string]>) =>
  tokens.find(([pattern]) => pattern.test(user_agent))?.[1];

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
  { ok: true; login_session_id: number; refresh_token: string } | { ok: false };

type RefreshTokenWithRelations = {
  id: number;
  token_hash: string;
  login_session_id: number;
  rotated_at: Date | null;
  expires_at: Date;
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
   * Idempotent: revoking an already-revoked session is a no-op success.
   *
   * @param login_session_id - the login session to revoke
   * @returns the revoked session id, for the caller to drop live sockets with
   */
  const revoke = async (login_session_id: number): Promise<number> => {
    await db.loginSession.updateMany({
      where: { id: login_session_id, revoked_at: null },
      data: { revoked_at: new Date() },
    });

    try {
      await deny_list.deny(login_session_id);
    } catch (err) {
      console.error(
        "Deny-key write failed after revocation committed; enforcement is degraded until warm-up or token expiry",
        { login_session_id, err },
      );
    }

    return login_session_id;
  };

  /**
   * Determine whether a replayed (already-rotated) token gets grace or trips reuse detection
   *
   * Only the immediate predecessor of the current live token is graced, and
   * only inside the 30-second window -- an older ancestor (one whose
   * successor has itself already been rotated) trips detection regardless
   * of timing (ADR-0009 KTD3).
   *
   * @param token - the already-rotated token that failed the rotation CAS
   * @returns the graced successor, or a failure (revoking the family when reuse is detected)
   */
  const disambiguateReplay = async (
    token: RefreshTokenWithRelations,
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

    await revoke(token.login_session_id);
    return { ok: false };
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

    const token = (await db.refreshToken.findUnique({
      where: { token_hash },
      include: { login_session: true, rotated_to: true },
    })) as RefreshTokenWithRelations | null;

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
      return disambiguateReplay(token);
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
      const fresh = (await db.refreshToken.findUnique({
        where: { id: token.id },
        include: { login_session: true, rotated_to: true },
      })) as RefreshTokenWithRelations;

      return disambiguateReplay(fresh);
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
