import { jwt_expiration_seconds } from "@server/controllers/AuthController";
import { db } from "@server/lib/data/db";

const DEFAULT_READ_TIMEOUT_MS = 500;
const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_CIRCUIT_COOLDOWN_MS = 30_000;

/** Minimal shape `DenyList` needs from a Redis client, so the throw and
 * timeout paths are testable with a small stub instead of a live connection. */
export type DenyListClient = {
  set: (
    key: string,
    value: string,
    options: { EX: number },
  ) => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
};

export type DenyListOptions = {
  read_timeout_ms?: number;
  failure_threshold?: number;
  circuit_cooldown_ms?: number;
};

export type DenyList = {
  deny: (login_session_id: number) => Promise<void>;
  isDenied: (login_session_id: number) => Promise<boolean>;
  warmUp: () => Promise<void>;
};

const denyKeyFor = (login_session_id: number) =>
  `deny.login_session.${login_session_id}`;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Redis read timed out")),
      ms,
    );

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });

/**
 * Look up whether a login session is revoked directly from Postgres
 *
 * The fallback path used when the deny-key read times out, errors, or the
 * circuit breaker is open. `revoked_at` committing is what revocation
 * durably means (ADR-0009 KTD6) -- this is never wrong, only potentially
 * stale by however long the deny key would have covered.
 *
 * @param login_session_id - the login session to check
 * @returns true if the session's `revoked_at` is set
 */
const isDeniedInPostgres = async (
  login_session_id: number,
): Promise<boolean> => {
  const session = await db.loginSession.findUnique({
    where: { id: login_session_id },
    select: { revoked_at: true },
  });

  return session?.revoked_at != null;
};

/**
 * Build a deny list bound to one Redis client
 *
 * Do not add auth policy to `Cache.ts` -- that module stays connection
 * management. The client is a constructor parameter (not the `Cache`
 * singleton) so the throw and degradation paths are testable with a stub.
 *
 * @param client - Redis client to read and write deny keys on
 * @param options - timeout and circuit-breaker tuning; defaults are production values
 * @returns deny/isDenied/warmUp bound to `client`
 */
export const createDenyList = (
  client: DenyListClient,
  options: DenyListOptions = {},
): DenyList => {
  const read_timeout_ms = options.read_timeout_ms ?? DEFAULT_READ_TIMEOUT_MS;
  const failure_threshold =
    options.failure_threshold ?? DEFAULT_FAILURE_THRESHOLD;
  const circuit_cooldown_ms =
    options.circuit_cooldown_ms ?? DEFAULT_CIRCUIT_COOLDOWN_MS;

  let consecutive_failures = 0;
  let circuit_open_until = 0;

  const circuitIsOpen = () => Date.now() < circuit_open_until;

  const recordFailure = () => {
    consecutive_failures += 1;

    if (consecutive_failures >= failure_threshold) {
      circuit_open_until = Date.now() + circuit_cooldown_ms;
    }
  };

  const recordSuccess = () => {
    consecutive_failures = 0;
    circuit_open_until = 0;
  };

  /**
   * Deny a login session, sized to the longest an access token can live
   *
   * A rejected write throws rather than logging -- a caller that swallows
   * this can report a revocation as successful when enforcement never
   * happened (ADR-0009 R8).
   *
   * @param login_session_id - the login session to deny
   * @throws when the underlying write fails
   */
  const deny = async (login_session_id: number): Promise<void> => {
    await client.set(denyKeyFor(login_session_id), "1", {
      EX: Number(jwt_expiration_seconds),
    });
  };

  /**
   * Determine whether a login session is currently denied
   *
   * @param login_session_id - the login session to check
   * @returns true if the session is denied
   */
  const isDenied = async (login_session_id: number): Promise<boolean> => {
    if (!circuitIsOpen()) {
      try {
        const value = await withTimeout(
          client.get(denyKeyFor(login_session_id)),
          read_timeout_ms,
        );

        recordSuccess();

        return value !== null;
      } catch (err) {
        console.error("Deny-key read failed, falling back to Postgres", {
          err,
        });
        recordFailure();
      }
    }

    return isDeniedInPostgres(login_session_id);
  };

  /**
   * Rewrite deny keys for every session revoked within one access-token lifetime
   *
   * Run at startup: the deny keyspace does not survive a cache restart or
   * container recreation, so a revocation just inside the window would
   * otherwise be silently forgotten (ADR-0009 KTD15).
   *
   * @throws when it cannot complete -- startup should fail rather than boot under-enforcing revocation
   */
  const warmUp = async (): Promise<void> => {
    const cutoff = new Date(Date.now() - Number(jwt_expiration_seconds) * 1000);

    const recently_revoked = await db.loginSession.findMany({
      where: { revoked_at: { gte: cutoff } },
      select: { id: true },
    });

    await Promise.all(recently_revoked.map(({ id }) => deny(id)));

    console.info(`Warmed ${recently_revoked.length} deny key(s) from Postgres`);
  };

  return { deny, isDenied, warmUp };
};
