// Re-exported so every existing server import of ACCESS_TOKEN_TTL_SECONDS
// from this module keeps working unchanged -- the value itself now lives in
// common/authConstants.ts, the one source of truth shared with the client
// (see that file's docblock for why).
export { ACCESS_TOKEN_TTL_SECONDS } from "@common/authConstants";

/**
 * Login session sliding inactivity window, in milliseconds
 *
 * A session that refreshes at least once within this window stays alive
 * (ADR-0009 R1). Shared with the refresh cookie's maxAge so the cookie
 * keeps covering the session's current idle deadline as it slides forward.
 */
export const IDLE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Login session absolute lifetime cap, in milliseconds
 *
 * Set once at login and copied forward unchanged on every rotation -- R1's
 * one-year ceiling regardless of how recently the session refreshed.
 */
export const ABSOLUTE_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;
