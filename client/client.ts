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
const refreshRetryLink: TRPCLink<ApiRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      let retried = false;

      const attempt = () =>
        next(op).subscribe({
          next(value) {
            observer.next(value);
          },
          error(err) {
            const status = (err.meta?.response as Response | undefined)?.status;

            if (status === 401 && !retried) {
              retried = true;
              refresh()
                .then(() => attempt())
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
  };
};

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
