# ADR-0009: Persistent login via rotating refresh tokens and revocable login sessions

- **Status:** Accepted
- **Date:** 2026-08-08
- **Deciders:** Anthony

## Context

The stated problem was "I get logged out too often." Investigation found four separate defects
wearing one costume:

1. **The access token cookie had no `maxAge`**, making it a *session cookie*. Chill installs as a
   standalone PWA, and a backgrounded PWA is routinely evicted by the OS; eviction ends the browser
   session and discards the cookie regardless of the JWT's own expiry.

2. **Dead tokens produced an HTML redirect, not a 401.** `isAuthenticated` was mounted globally with
   no path, so API calls hit `failureRedirect` and `fetch` followed it to the login page, which
   returns HTTP 200 with HTML. tRPC then failed parsing JSON. With no error handling on the client,
   the UI simply froze — the reported symptom was "unresponsive", not "logged out".

3. **The redirect was `301`, not `302`.** Browsers cache permanent redirects durably. Once a
   cover-art URL had redirected to the login page it kept redirecting after a successful re-login,
   until site data was cleared. This is the only defect that outlives a new session, and it made the
   other three look worse than they were.

4. **Session length itself** — a 6h ceiling on a long-lived music player.

Only the fourth is what a refresh token addresses. The first three had to be fixed regardless.

A key finding reframed the security discussion. Access token TTL is commonly justified as limiting
damage from a stolen device, but that is wrong here: a thief holding the phone simply lets the app
refresh itself. TTL does not bound the thief's access; **revocation** does. What TTL actually bounds
is (a) the lag between hitting revoke and the device dying, and (b) the lifetime of a leak where the
attacker obtained *only* the access token — plausible precisely because the refresh cookie is
path-scoped and absent from ordinary requests.

Since revocation lag is measured against how long it takes a human to notice a missing phone —
hours — the difference between a 15-minute and a 12-hour TTL is close to meaningless for theft.

Two further constraints came from the app itself:

- **Nothing can retry a browser-driven request.** Cover art is raw `<img src>` in five places plus
  one CSS `url()` background, and playback is a bare `Audio` element; all of them hit `/api/v1/*`
  with no JS in the request path. On a 401 images break silently and playback stops mid-track.
  Shortening the TTL multiplies these failures in direct proportion. A service worker is the only
  mechanism that could intercept them, and [[0005-offline-sync-deferred-to-native-client]] has
  already ruled one out.

- **Rotation frequency is the race surface.** Strict reuse detection revokes a whole token family on
  any replay, which cannot distinguish a genuine replay from two of your own clients refreshing at
  once. Fewer rotations means fewer chances to false-positive. A long TTL and strict policy are
  therefore complements, not opposites — the pairing people regret is strict policy with a short TTL.

Revocation was initially scoped as lazy (checked only at refresh) to avoid adding a per-request
round-trip. That premise was false, and by more than assumed. `isAuthenticated` is mounted twice —
globally, and again on `/api/v1` — so an API request runs the whole chain twice. Each pass costs
**two** Redis lookups (`tokenNotRevoked`, then `verifyAndDecodeJwt` calling the same blacklist check
again) *and* a Postgres `user.findUnique` inside the passport JWT strategy. That is four Redis
round-trips and two user queries per API request, on every cover-art and audio range request.
Instant revocation is therefore not a new cost, and removing the duplicate mount is the largest
performance change in this ADR.

## Decision

1. **Login session** becomes the unit of revocation: a persisted row per `(user_id, device_id)`,
   distinct from the pre-existing **device session** (`session_id`), which remains a low-entropy,
   publicly-displayed WebSocket routing handle with no authority. See `docs/glossary.md`. Rows past
   the sliding expiry or the absolute cap are pruned, and the session list hides revoked and expired
   rows — `device_id` lives in `localStorage`, so clearing site data mints a new one and a new row,
   and without pruning the list fills with phantom entries for one physical phone.

2. **Access token: 12h**, JWT, `httpOnly`, `sameSite: "lax"`, explicit `maxAge`. Carries the login
   session id. Twelve hours keeps rotations near two per device per day and concedes little, because
   TTL was never the theft defence. It does **not** guarantee a token outlives a listening session:
   a session starts at an arbitrary point in the token's life, so what matters is *remaining* TTL,
   which is frequently short. Decision 8 handles that directly rather than leaning on TTL to absorb
   it. This is a deliberate deviation from NIST SP 800-63B's general 30-day reauthentication guidance,
   recorded here per OWASP ASVS 7.1.1's requirement to document deviations from the token-lifetime
   guidance it references: once the deny key is checked per request (decision 5), TTL no longer
   bounds revocation lag, so what a shorter ceiling would actually buy is a smaller window for an
   access-token-only leak and a smaller fallback blast radius if the deny-key cache is unavailable —
   both already small, and both traded against `<img>`/`<audio>` requests that cannot retry on 401.

3. **Refresh token: opaque, `httpOnly`, `sameSite: "strict"`, `path=/auth/refresh`**, rotated on
   every use. Sliding 90-day expiry reset on each rotation (the session's *inactivity timeout* --
   a session that goes 90 days without a refresh is treated as abandoned), under a fixed one-year
   absolute cap from login. Ordinary use means never logging in again; the cap keeps a session from
   living forever.

4. **Strict reuse detection.** Presenting an already-rotated token revokes the entire family. The
   re-login upsert starts a *new* family, so predecessors orphaned by re-login 401 quietly instead
   of raising the alarm.

5. **Instant revocation.** Replace the two token-string blacklist lookups with a single deny-key
   lookup on login session id, TTL matching the maximum remaining access token life. `blacklistToken`
   and the `token.blacklist.*` scheme are deleted; logout and remote revoke become one operation.
   **The deny-key write must fail loudly** — today `blacklistToken` swallows Redis errors into a
   log line and logout reports success regardless. That is survivable when the exposure is one 6h
   token; it is not when the deny key *is* revocation and the session behind it can refresh for a
   year. Logout and remote revoke report failure if the write is not confirmed.

6. **Revocation reaches WebSockets and cast tokens.** Sockets are tagged with their login session id
   at upgrade and dropped on revoke — *all* of them, since one login session can hold several
   sockets and the existing lookup returns only the first match. Cast tokens carry the login session
   id and check the same deny key. Because that converges the cast and access token payloads on a
   shared field, both token types also gain an explicit `typ` claim, checked on verify. They share
   `SIGNING_KEY` and are currently non-substitutable only by accident of their payload schemas;
   this decision erodes that accident, so it pays for the fix rather than deferring it.

7. **Split the 401 contract.** `isAuthenticatedApi` returns JSON 401 under `/api/v1`;
   `isAuthenticatedPage` redirects the SPA shell with **302**, never 301. The global mount is
   removed so API calls stop being caught by the page-oriented handler, which also ends the
   double-run of the whole chain on every API request.

8. **Client refresh is expiry-driven.** The refresh response returns the new expiry; the client
   persists it beside `device_id` in `localStorage` and refreshes on mount, on foreground, and
   before starting playback — each only when near expiry, all behind a single-flight promise, with a
   401 refresh-and-retry backstop on the tRPC link. The playback trigger is what decision 2 defers
   to: mount and foreground both miss the common case of hitting play in an already-foregrounded tab
   and then backgrounding the phone. Playback start is JS-driven, so unlike the `<img>` and `<audio>`
   fetches themselves it can refresh first.

9. **CSRF defence in depth on refresh**: `sameSite: "strict"`, POST-only, and a required non-simple
   header. Under strict reuse detection a forced cross-site rotation is not merely useless to an
   attacker — it is a repeatable logout attack — so this is load-bearing, not ceremony.

10. **Existing tokens are invalid at deploy.** An access token minted before this change carries no
    login session id, so there is no key to check a deny entry against. Those tokens are rejected
    and everyone logs in once. Failing open would mean up to six hours of un-revocable sessions,
    which is the thing this ADR exists to eliminate. This needs a new `LoginSession` model and
    migration; there is no session table today.

## Consequences

- Revoking a login session kills API access, WebSocket control, and Chromecast streaming on that
  device at its next request. This makes the "where am I logged in" list actionable, which was the
  point of choosing a session table over sliding expiry.
- Four Redis round-trips and two user queries per API request collapse to roughly one of each,
  including on cover art and audio range requests. Most of that comes from removing the duplicate
  `isAuthenticated` mount rather than from the deny key itself.
- `device_id` is client-supplied via `localStorage` and spoofable, but scoped under an authenticated
  `user_id`. Because the row is the unit of revocation, clobbering it logs the *other* device out —
  the reported symptom — though this needs a genuinely duplicated `device_id` and so is rare.
  **Correction:** an earlier draft of this ADR justified keeping `device_id` in `localStorage` by
  claiming it "survives PWA eviction, which the session cookie did not" — that is inverted. WebKit
  exempts cookies from both the ITP seven-day script-storage cap and quota eviction, while
  `localStorage` is in scope for both; if anything, the cookie is the more durable of the two. The
  decision still holds regardless: `device_id` is read only at login, and refresh resolves the login
  session from the presented refresh token, not from `device_id` — so `localStorage` eviction cannot
  fork or orphan a live session, it can only cause a later login to be treated as a new device.
- The session list is **not** the existing device picker. That shows device sessions — sockets
  connected right now, for casting. This shows logins, including a phone in a drawer.
- Deliberately not done: periodic WebSocket re-validation. A socket whose access token expired
  underneath it still lives until disconnect or revoke — acceptable now that revoke reaches sockets
  directly.
- Device sessions stay `nanoid(4)`. They are the WebSocket routing handle, so collisions misroute
  cast control, and logins that persist for a year mean more live handles at once than a 6h ceiling
  ever produced. Not fixed here, but this ADR is what makes it worth watching.
- No service worker, honouring [[0005-offline-sync-deferred-to-native-client]]. The residual gap is
  that a backgrounded `<audio>` request failing on a dead token cannot self-heal. Refreshing at
  playback start narrows this to sessions that outlast a token refreshed moments earlier — rare
  rather than impossible; the native client named in ADR-0005 controls its own HTTP stack and closes
  it properly.

## Open

- Whether page JS survives background playback on iOS is untested. If a playlist keeps advancing
  with the phone locked, timers run and the near-expiry refresh is sufficient. If it does not, the
  residual gap above is wider than assumed on that platform — reachable by any listening session
  that outlasts the token's *remaining* life. Refreshing at playback start is what keeps this bounded
  on iOS regardless of the answer, since that trigger fires while the page is certainly alive.
- Whether to split `SIGNING_KEY` per token type. It is currently triple-purposed: it signs access
  tokens, signs cast tokens, and is the secret `cookieParser` uses to sign/verify the cookie jar
  (`app.use(cookieParser(env.SIGNING_KEY))`). One leak invalidates all three. Decision 6's `typ`
  claim makes token *substitution* structurally impossible, which is the part that actually mattered
  for this ADR; separating the keys themselves is hygiene, not a security requirement this work
  depends on, so it is deferred rather than blocking.
