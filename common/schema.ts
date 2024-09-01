import { z } from "zod";
import { SortOrder } from "./types";

const sort_schema = z.record(z.nativeEnum(SortOrder).default(SortOrder.asc));

export type SortClause = z.infer<typeof sort_schema>;

export const pagination_schema = z.object({
  limit: z.number().int(),
  page: z.number().int(),
  sort: z.array(sort_schema).default([]),
});
