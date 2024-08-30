import type { ApiRouter } from "../server/trpc";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";

export const api = createTRPCProxyClient<ApiRouter>({
  links: [httpBatchLink({ url: "/api/v1/trpc" })],
});
