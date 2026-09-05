/**
 * Access token lifetime, in seconds
 *
 * Shared between server and client: the server signs tokens with this
 * lifetime and uses it to size the deny-key TTL (see
 * server/lib/auth/constants.ts), while the client estimates when a token is
 * close to expiring so it can refresh proactively (see
 * client/lib/auth/refresh.ts). Being wrong about it on the client only
 * costs an extra refresh call -- the server's own verification of the
 * token's real `exp` claim is the actual security boundary (ADR-0009 KTD1)
 * -- but a single source of value still beats two copies drifting apart.
 *
 * Once the deny key is checked per request, TTL no longer bounds
 * revocation lag -- it only bounds an access-token-only leak and the
 * fallback window if the cache is unavailable. 12 hours sits above the
 * longest-running mobile audio range-stream.
 */
export const ACCESS_TOKEN_TTL_SECONDS = 3600 * 12;
