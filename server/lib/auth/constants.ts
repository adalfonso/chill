/**
 * Access token lifetime, in seconds
 *
 * Once the deny key is checked per request, TTL no longer bounds
 * revocation lag -- it only bounds an access-token-only leak and the
 * fallback window if the cache is unavailable. 12 hours sits above the
 * longest-running mobile audio range-stream (ADR-0009 KTD1).
 */
export const ACCESS_TOKEN_TTL_SECONDS = 3600 * 12;

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
