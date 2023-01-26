import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { ApiRouter } from "../server/trpc.mjs";

export const client = createTRPCProxyClient<ApiRouter>({
  links: [httpBatchLink({ url: "/api/v1/trpc" })],
});
