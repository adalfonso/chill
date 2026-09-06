import { ChillWss } from "@server/registerServerSocket";
import { loginSessionService } from "@server/lib/auth/LoginSession";

/**
 * Revoke a login session and drop every live socket it holds
 *
 * Composes `LoginSessionService.revoke()` with `wss.dropByLoginSession()` --
 * the one thing every revocation entry point (logout, the user-initiated
 * session-list revoke/revokeOthers, and reuse-detection) needs beyond the
 * service call itself. Kept out of `LoginSessionService`, which stays
 * ignorant of the socket server (see its `revoke()` docblock).
 *
 * @param login_session_id - the login session to revoke
 * @param wss - socket server to drop the session's live connections from
 * @param options.owner_user_id - when set, the revoke is scoped to sessions
 *   owned by this user (see `LoginSessionService.revoke`); omit when the
 *   caller already trusts the session id it's holding (logout, reuse
 *   detection)
 * @returns whether the session was revoked (or already was) -- false only
 *   when `owner_user_id` was set and didn't match
 */
export const revokeAndDisconnect = async (
  login_session_id: number,
  wss: ChillWss,
  options: { owner_user_id?: number } = {},
): Promise<boolean> => {
  const { ok } = await loginSessionService
    .instance()
    .revoke(login_session_id, options);

  if (ok) {
    wss.dropByLoginSession(login_session_id);
  }

  return ok;
};
