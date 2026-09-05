import type { ApiRouter } from "../server/trpc";
import {
  createTRPCProxyClient,
  httpBatchLink,
  loggerLink,
  TRPCLink,
} from "@trpc/client";
import { observable } from "@trpc/server/observable";

import { refresh } from "@client/lib/auth/refresh";

// isAuthenticatedApi rejects a dead access token before the request ever
// reaches a procedure, so httpBatchLink batches N operations into one dead
// request and each would otherwise call refresh() independently -- the
// single-flight promise in refresh() is what keeps that to one round trip.
// Not automated: no link test harness exists (see U6's Test scenarios note
// on the same limitation for server-side auth integration).
//
// Stays above `api` (rather than below, per this project's usual
// exports-on-top convention) because `api`'s links array needs this value
// immediately at module-evaluation time, not lazily inside a later-called
// function -- `const` isn't hoisted, so a forward reference here would
// throw ("used before its declaration") the moment this module loads.
const refreshRetryLink: TRPCLink<ApiRouter> =
  () =>
  ({ next, op }) =>
    observable((observer) => {
      // retries_left counts down as a parameter instead of a `retried`
      // flag mutated from inside the handler below -- one fewer piece of
      // state to track across the closure.
      const attempt = (retries_left = 1) =>
        next(op).subscribe({
          next(value) {
            observer.next(value);
          },
          error(err) {
            const status = (err.meta?.response as Response | undefined)?.status;

            if (status === 401 && retries_left > 0) {
              refresh()
                .then(() => attempt(retries_left - 1))
                .catch(() => observer.error(err));
              return;
            }

            observer.error(err);
          },
          complete() {
            observer.complete();
          },
        });

      return attempt();
    });

export const api = createTRPCProxyClient<ApiRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
    }),
    refreshRetryLink,
    httpBatchLink({ url: "/api/v1/trpc" }),
  ],
});
