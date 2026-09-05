import {
  getAccessTokenExpiryHint,
  setAccessTokenExpiryHint,
} from "@client/lib/DeviceInfo";
import { ACCESS_TOKEN_TTL_SECONDS } from "@common/authConstants";

const REFRESH_ENDPOINT = "/auth/refresh";
const LOGIN_PATH = "/auth/login";

/** Navigate to the login page -- a full page load, not client-side routing, since logging out (or a dead session) should reset all app state. */
export const redirectToLogin = (): void => {
  window.location.href = LOGIN_PATH;
};

// Estimate, not a security or correctness boundary (ADR-0009 KTD1) --
// being wrong about it only costs an extra refresh call.
const ACCESS_TOKEN_TTL_MS = ACCESS_TOKEN_TTL_SECONDS * 1000;

// Refresh proactively once less than this much of the token's estimated
// life remains, so an ordinary trigger (mount, foreground) rarely has to
// race a request against an already-dead token.
const REFRESH_SKIP_THRESHOLD_MS = 30 * 60 * 1000;

// Bounds the refresh request itself so a Redis/DB hang on the server can't
// wedge this promise (and therefore every caller sharing it) indefinitely.
const REFRESH_FETCH_TIMEOUT_MS = 10_000;

let in_flight: Promise<void> | null = null;

/**
 * Build a signal that aborts after `ms`
 *
 * `AbortSignal.timeout` covers this in modern runtimes, but isn't
 * available in every target (older browsers, the project's jsdom test
 * environment) -- `AbortController` is, so build the equivalent manually.
 *
 * @param ms - milliseconds until the returned signal aborts
 * @returns a signal that aborts after `ms`
 */
const timeoutSignal = (ms: number): AbortSignal => {
  const controller = new AbortController();

  setTimeout(() => controller.abort(), ms);

  return controller.signal;
};

/** POST /auth/refresh once, bounded by `REFRESH_FETCH_TIMEOUT_MS`. */
const postRefresh = (): Promise<Response> =>
  fetch(REFRESH_ENDPOINT, {
    method: "POST",
    headers: { "X-Requested-With": "fetch" },
    signal: timeoutSignal(REFRESH_FETCH_TIMEOUT_MS),
  });

/**
 * Rotate the refresh token once, retrying at most once on a 401
 *
 * A concurrent tab can legitimately win the same rotation race: this
 * request's cookie is now stale, but the session is still alive. The
 * server's response is deliberately generic either way (ADR-0009 KTD17 --
 * the log stream is the only channel that distinguishes a benign race from
 * real reuse), so this can't be told apart from actual reuse by status
 * code alone. Retrying once picks up whatever cookie is in the jar now
 * (already updated if the other tab's response landed first) before
 * concluding the session is dead; a genuinely revoked session still fails
 * the retry with the same token and falls through to `redirectToLogin`.
 *
 * @param is_retry - true when this call is the one allowed retry
 * @returns resolves once a fresh access token cookie is set
 * @throws on a definitive failure (a 401 that survives the retry, or a
 *   non-OK non-401 status); a transient network error propagates as-is
 */
const doRefresh = async (is_retry = false): Promise<void> => {
  const response = await postRefresh();

  if (response.status === 401) {
    // First failure -- not conclusive yet. Retry once before giving up, in
    // case this was the benign concurrent-tab race described above.
    if (!is_retry) {
      return doRefresh(true);
    }

    // Redirect before rejecting, so every caller sharing this promise ends
    // up on the login page rather than each having to notice the rejection
    // and redirect themselves.
    redirectToLogin();
    throw new Error("Session expired");
  }

  if (!response.ok) {
    throw new Error(`Refresh failed with status ${response.status}`);
  }

  setAccessTokenExpiryHint(Date.now() + ACCESS_TOKEN_TTL_MS);
};

/**
 * Refresh the access token, sharing one in-flight request across concurrent callers
 *
 * A rejected attempt is never cached -- the next call starts a fresh
 * request rather than replaying a stale failure.
 *
 * @returns resolves once a fresh access token cookie is set
 * @throws on any failure. Only a definitive 401 means the session is dead
 *   (and it already redirects before rejecting); a transient failure
 *   (network error, 5xx) must not be read as "log the user out" by callers.
 */
export const refresh = (): Promise<void> => {
  if (in_flight) {
    return in_flight;
  }

  const attempt = doRefresh().finally(() => {
    // Only clear the slot if it's still this attempt -- guards against a
    // newer attempt's slot being cleared by this one settling late.
    if (in_flight === attempt) {
      in_flight = null;
    }
  });

  in_flight = attempt;

  return attempt;
};

/**
 * Refresh only if the cached expiry hint says the access token is running low
 *
 * A missing hint (cleared localStorage, first load this session) is treated
 * as "refresh now," not "session dead" -- the hint is a cache (ADR-0009 U7).
 *
 * @returns resolves once refreshed, or immediately if the refresh was skipped
 */
export const maybeRefresh = (): Promise<void> => {
  const expires_at = getAccessTokenExpiryHint();

  if (
    expires_at !== null &&
    expires_at - Date.now() > REFRESH_SKIP_THRESHOLD_MS
  ) {
    return Promise.resolve();
  }

  return refresh();
};

// Foreground trigger. Registered at module load rather than from a
// component, matching SocketClient's self-contained visibilitychange setup.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    maybeRefresh().catch(() => {});
  }
});
