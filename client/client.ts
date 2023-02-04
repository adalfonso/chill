import superjson from "superjson";
import type { ApiRouter } from "../server/trpc";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";

export const client = createTRPCProxyClient<ApiRouter>({
  transformer: superjson,
  links: [httpBatchLink({ url: "/api/v1/trpc" })],
});
