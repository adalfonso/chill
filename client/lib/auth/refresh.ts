import {
  getAccessTokenExpiryHint,
  setAccessTokenExpiryHint,
} from "@client/lib/DeviceInfo";

const REFRESH_ENDPOINT = "/auth/refresh";
const LOGIN_PATH = "/auth/login";

/** Navigate to the login page -- a full page load, not client-side routing, since logging out (or a dead session) should reset all app state. */
export const redirectToLogin = (): void => {
  window.location.href = LOGIN_PATH;
};

// Mirrors server/lib/auth/constants.ts ACCESS_TOKEN_TTL_SECONDS. Client and
// server are separate bundles with no shared constants module for this;
// being wrong about it only costs an extra refresh call; it is a cache, not
// a security or correctness boundary (ADR-0009 KTD1).
const ACCESS_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

// Refresh proactively once less than this much of the token's estimated
// life remains, so an ordinary trigger (mount, foreground) rarely has to
// race a request against an already-dead token.
const REFRESH_SKIP_THRESHOLD_MS = 30 * 60 * 1000;

let in_flight: Promise<void> | null = null;

const doRefresh = async (): Promise<void> => {
  const response = await fetch(REFRESH_ENDPOINT, {
    method: "POST",
    headers: { "X-Requested-With": "fetch" },
  });

  if (response.status === 401) {
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
