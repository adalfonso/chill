import { loginSessionService } from "@server/lib/auth/LoginSession";

const DEFAULT_SESSION_PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Start the periodic login-session pruner
 *
 * There is no existing scheduler in this codebase to reuse -- library
 * scanning is admin-pull only. Mirrors startRenditionWorker's setInterval
 * shape instead, the only other periodic scaffolding here: a reentrancy
 * flag so a slow tick can't overlap itself, and a caught/logged failure
 * that leaves the interval running rather than crashing the process.
 *
 * @param interval_ms - how often to sweep; defaults to once a day
 */
export const startSessionPruner = (
  interval_ms: number = DEFAULT_SESSION_PRUNE_INTERVAL_MS,
): void => {
  console.info(`Session pruner: starting (interval_ms=${interval_ms})`);

  let pruning = false;

  const tick = () => {
    if (pruning) {
      return;
    }

    pruning = true;

    loginSessionService
      .instance()
      .prune()
      .then(({ count }) => {
        if (count > 0) {
          console.info(
            `Session pruner: removed ${count} expired login session(s)`,
          );
        }
      })
      .catch((error) => console.error("Session pruner tick failed", { error }))
      .finally(() => {
        pruning = false;
      });
  };

  setInterval(tick, interval_ms);
};
