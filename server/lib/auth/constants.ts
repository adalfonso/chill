/**
 * Access token lifetime, in seconds
 *
 * Once the deny key is checked per request, TTL no longer bounds
 * revocation lag -- it only bounds an access-token-only leak and the
 * fallback window if the cache is unavailable. 12 hours sits above the
 * longest-running mobile audio range-stream (ADR-0009 KTD1).
 */
export const ACCESS_TOKEN_TTL_SECONDS = 3600 * 12;
