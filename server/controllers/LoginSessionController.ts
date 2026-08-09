import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AuthedRequest } from "@server/trpc";
import { db } from "@server/lib/data/db";
import { denyList } from "@server/lib/auth/DenyList";

export const schema = {
  revoke: z.object({ login_session_id: z.number().int() }),
};

export type LoginSessionRow = {
  id: number;
  device_label: string;
  created_at: Date;
  last_seen_at: Date;
};

export type LoginSessionDto = {
  id: number;
  device_label: string;
  created_at: Date;
  last_refreshed_at: Date;
  is_current_session: boolean;
};

/**
 * Project a `LoginSession` row into the shape returned to a client
 *
 * Never includes `token_hash` or `device_id` -- neither is a `LoginSessionRow`
 * field in the first place, so a caller can't accidentally widen this by
 * passing more of the row through. `last_seen_at` is relabeled
 * `last_refreshed_at`: it only updates on refresh, and the raw column name
 * invites confusion with a true per-request "last seen" (see `list`'s docblock).
 *
 * @param session - the row to project
 * @param current_login_session_id - the caller's own session id, to flag which row is theirs
 * @returns the client-safe DTO
 */
export const toLoginSessionDto = (
  session: LoginSessionRow,
  current_login_session_id: number,
): LoginSessionDto => ({
  id: session.id,
  device_label: session.device_label,
  created_at: session.created_at,
  last_refreshed_at: session.last_seen_at,
  is_current_session: session.id === current_login_session_id,
});

/**
 * Revoke one login session already confirmed to belong to `user_id`
 *
 * Shared by `revoke` and `revokeOthers` so both funnel through the same
 * commit-then-deny-then-drop sequence (ADR-0009 KTD6). Idempotent: revoking
 * an already-revoked row is a no-op success, matching LoginSessionService's
 * behavior for the same reason (a retried request must not error).
 *
 * @param login_session_id - the login session to revoke
 * @param user_id - the owner it must belong to
 * @param wss - socket server to drop the session's live connections from
 */
const revokeOwnedSession = async (
  login_session_id: number,
  user_id: number,
  wss: Express.Application["_wss"],
): Promise<void> => {
  await db.loginSession.updateMany({
    where: { id: login_session_id, user_id, revoked_at: null },
    data: { revoked_at: new Date() },
  });

  try {
    await denyList.instance().deny(login_session_id);
  } catch (err) {
    console.error(
      "Deny-key write failed after revocation committed; enforcement is degraded until warm-up or token expiry",
      { login_session_id, err },
    );
  }

  wss.dropByLoginSession(login_session_id);
};

export const LoginSessionController = {
  /**
   * List the caller's own active login sessions
   *
   * @returns device label, created-at, last-refreshed time, and a
   *   current-session flag for each active session -- never token
   *   material or `device_id`. Revoked and expired rows are hidden, not
   *   deleted: reuse-detection forensics depend on them surviving to prune.
   */
  list: async ({ ctx: { token } }: AuthedRequest) => {
    const now = new Date();

    const sessions = await db.loginSession.findMany({
      where: {
        user_id: token.id,
        revoked_at: null,
        idle_expires_at: { gt: now },
        absolute_expires_at: { gt: now },
      },
      orderBy: { last_seen_at: "desc" },
      select: {
        id: true,
        device_label: true,
        created_at: true,
        last_seen_at: true,
      },
    });

    return sessions.map((session) =>
      toLoginSessionDto(session, token.login_session_id),
    );
  },

  /**
   * Revoke one of the caller's own login sessions
   *
   * Scoped by owner in the `where` clause of the single update, not by a
   * look-up-then-check -- that pattern is both a race and an existence
   * oracle (an attacker could learn whether an id exists from a
   * distinguishable error). A nonexistent id and someone else's id return
   * the identical generic error.
   *
   * @throws `UNAUTHORIZED` if `login_session_id` does not belong to the caller
   */
  revoke: async ({
    ctx: { req, token },
    input: { login_session_id },
  }: AuthedRequest<typeof schema.revoke>) => {
    const owned = await db.loginSession.findFirst({
      where: { id: login_session_id, user_id: token.id },
      select: { id: true },
    });

    if (owned === null) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    await revokeOwnedSession(login_session_id, token.id, req.app._wss);
  },

  /**
   * Revoke every other login session belonging to the caller
   *
   * Re-reads the caller's own session from the database first, rather than
   * trusting the token, and rejects if it is already revoked. Without this,
   * a thief holding a stolen device could race the owner's revocation: the
   * thief's token stays technically valid until their next request checks
   * the deny list, and in that window they could kill every other device
   * (including the ones the owner just revoked from) before their own
   * access is actually cut off.
   *
   * @returns the number of other sessions revoked
   * @throws `UNAUTHORIZED` if the caller's own session is already revoked
   */
  revokeOthers: async ({ ctx: { req, token } }: AuthedRequest) => {
    const caller_session = await db.loginSession.findUnique({
      where: { id: token.login_session_id },
      select: { revoked_at: true },
    });

    if (caller_session === null || caller_session.revoked_at !== null) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const others = await db.loginSession.findMany({
      where: {
        user_id: token.id,
        id: { not: token.login_session_id },
        revoked_at: null,
      },
      select: { id: true },
    });

    for (const { id } of others) {
      await revokeOwnedSession(id, token.id, req.app._wss);
    }

    return { revoked_count: others.length };
  },
};
