import { z } from "zod";

export const pagination_options = z.object({
  limit: z.number(),
  page: z.number(),
});
