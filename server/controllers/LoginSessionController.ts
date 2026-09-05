import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AuthedRequest } from "@server/trpc";
import { db } from "@server/lib/data/db";
import { loginSessionService } from "@server/lib/auth/LoginSession";
import { LoginSessionDto } from "@common/types";

export const schema = {
  revoke: z.object({ login_session_id: z.number().int() }),
};

export type LoginSessionRow = {
  id: number;
  device_label: string;
  created_at: Date;
  last_seen_at: Date;
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
   * A nonexistent id and someone else's id return the identical generic
   * error -- see `revokeOwnedSession`'s docblock for why that's a single
   * atomic update rather than a look-up-then-check.
   *
   * @throws `UNAUTHORIZED` if `login_session_id` does not belong to the caller
   */
  revoke: async ({
    ctx: { req, token },
    input: { login_session_id },
  }: AuthedRequest<typeof schema.revoke>) => {
    const owned = await revokeOwnedSession(
      login_session_id,
      token.id,
      req.app._wss,
    );

    if (!owned) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
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

    // Each revocation is scoped to an independent login_session_id -- no
    // shared mutable state or ordering dependency between them (KTD6's
    // commit-then-deny ordering applies within one session's revocation,
    // not across different sessions), so they run concurrently rather than
    // paying N sequential DB+Redis round trips.
    await Promise.all(
      others.map(({ id }) => revokeOwnedSession(id, token.id, req.app._wss)),
    );

    return { revoked_count: others.length };
  },
};

/**
 * Revoke one of a user's own login sessions and drop its live sockets
 *
 * The ownership check and the revocation are the single atomic update
 * inside `LoginSessionService.revoke` (owner-scoped) -- there is no
 * separate look-up-then-check here, which would be both a race and an
 * existence oracle. Socket-dropping is the one piece of behavior specific
 * to this entry point, layered on top of the shared revoke so the service
 * itself stays ignorant of the socket server.
 *
 * @param login_session_id - the login session to revoke
 * @param user_id - the owner it must belong to
 * @param wss - socket server to drop the session's live connections from
 * @returns whether the session was owned by `user_id` (and so was revoked, or already was)
 */
const revokeOwnedSession = async (
  login_session_id: number,
  user_id: number,
  wss: Express.Application["_wss"],
): Promise<boolean> => {
  const { ok } = await loginSessionService
    .instance()
    .revoke(login_session_id, { owner_user_id: user_id });

  if (ok) {
    wss.dropByLoginSession(login_session_id);
  }

  return ok;
};
