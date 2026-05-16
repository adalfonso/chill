import type { ApiRouter } from "../server/trpc";
import { apiUrl } from "./lib/serverUrl";
import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";

export const api = createTRPCProxyClient<ApiRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: apiUrl("/api/v1/trpc"),
      fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
    }),
  ],
});
