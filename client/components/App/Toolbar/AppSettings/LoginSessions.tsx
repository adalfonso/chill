import { effect, useSignal } from "@preact/signals";

import { api } from "@client/client";
import { Raw } from "@common/types";
import type { LoginSessionDto } from "@server/controllers/LoginSessionController";

type LoginSessionClient = Raw<LoginSessionDto>;

export const LoginSessions = () => {
  const sessions = useSignal<Array<LoginSessionClient>>([]);
  const is_loading = useSignal(true);
  const error = useSignal("");
  const busy_id = useSignal<number | null>(null);
  const revoking_others = useSignal(false);

  const load = () => {
    is_loading.value = true;
    error.value = "";

    api.loginSession.list
      .query()
      .then((data) => (sessions.value = data))
      .catch(() => (error.value = "Failed to load login sessions."))
      .finally(() => (is_loading.value = false));
  };

  effect(load);

  const revoke = (login_session_id: number) => () => {
    if (busy_id.value !== null) {
      return;
    }

    busy_id.value = login_session_id;
    error.value = "";

    api.loginSession.revoke
      .mutate({ login_session_id })
      .then(load)
      .catch(() => (error.value = "Failed to revoke that session."))
      .finally(() => (busy_id.value = null));
  };

  const revokeOthers = () => {
    if (revoking_others.value) {
      return;
    }

    revoking_others.value = true;
    error.value = "";

    api.loginSession.revokeOthers
      .mutate()
      .then(load)
      .catch(() => (error.value = "Failed to revoke other sessions."))
      .finally(() => (revoking_others.value = false));
  };

  return (
    <div className="setting-login-sessions setting">
      <h2>Login sessions</h2>

      {error.value && <div className="ui-error">{error.value}</div>}

      {is_loading.value && sessions.value.length === 0 ? (
        <div>Loading…</div>
      ) : (
        <>
          <div className="login-session-list">
            {sessions.value.map((session) => (
              <div key={session.id} className="login-session-row">
                <div className="login-session-info">
                  <div className="login-session-label">
                    {session.device_label}
                    {session.is_current_session && " (this device)"}
                  </div>
                  <div className="login-session-meta">
                    Signed in {new Date(session.created_at).toLocaleString()}
                    <br />
                    Last refreshed{" "}
                    {new Date(session.last_refreshed_at).toLocaleString()}
                  </div>
                </div>

                {!session.is_current_session && (
                  <button
                    onClick={revoke(session.id)}
                    disabled={busy_id.value === session.id}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>

          {sessions.value.length > 1 && (
            <button onClick={revokeOthers} disabled={revoking_others.value}>
              Log out all other devices
            </button>
          )}
        </>
      )}
    </div>
  );
};
